export * as SpecialistRunner from "./specialist-runner"

import { Context, Effect, Layer, Fiber, FiberSet } from "effect"
import type { Graph } from "../planner/execution-graph"
import { ExecutionScheduler } from "./execution-scheduler"
import { SpecialistExecutor } from "./specialist-executor"
import { FailureRecovery } from "./recovery"
import type { SpecialistResult } from "./specialist-result"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { PlanningPolicy } from "../planner/planning-policy"
import type { TaskType } from "../types/classification"

export interface RunnerInput {
  readonly graph: Graph
  readonly policy: PlanningPolicy
  readonly capabilityPlan: CapabilityPlan
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly knowledgeBundle: KnowledgeBundle
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly repositorySize: number
}

export interface RunnerOutput {
  readonly results: readonly SpecialistResult[]
  readonly completed: readonly string[]
  readonly failed: readonly string[]
  readonly partial: boolean
}

export interface Interface {
  readonly run: (input: RunnerInput) => Effect.Effect<RunnerOutput>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistRunner") {}

const run: Interface["run"] = Effect.fn("SpecialistRunner.run")(function* (input) {
  const scheduler = yield* ExecutionScheduler.Service
  const executor = yield* SpecialistExecutor.Service
  const recovery = yield* FailureRecovery.Service

  const schedule = yield* scheduler.schedule({
    graph: input.graph,
    policy: input.policy,
    capabilityPlan: input.capabilityPlan,
    knowledgePlan: input.knowledgePlan,
    repositorySize: input.repositorySize,
  })

  const results: SpecialistResult[] = []
  const completed: string[] = []
  const failed: string[] = []

  for (const batch of schedule.batches) {
    const batchResults = yield* Effect.forEach(
      batch.nodeIDs,
      (nodeID) =>
        recovery.withTimeout(
          recovery.attempt(() => executor.execute({
            specialist: findSpecialist(input.graph, nodeID, input.knowledgeBundle),
            taskObjective: input.taskObjective,
            taskType: input.taskType,
            knowledgeBundle: input.knowledgeBundle,
            knowledgePlan: input.knowledgePlan,
            capabilityPlan: input.capabilityPlan,
          })),
          recoveryWithConfig().timeoutMs,
        ).pipe(
          Effect.either,
          Effect.map((either) => ({ nodeID, either })),
        ),
      { concurrency: batch.parallel ? "unbounded" : 1 },
    )

    for (const { nodeID, either } of batchResults) {
      if (either._tag === "Right") {
        results.push(either.right)
        completed.push(nodeID)
      } else {
        failed.push(nodeID)
      }
    }
  }

  const partial = failed.length > 0 && completed.length > 0

  return { results, completed, failed, partial }
})

function findSpecialist(graph: Graph, nodeID: string, _bundle: KnowledgeBundle) {
  const node = graph.nodes.find((n) => n.id === nodeID)
  if (!node) throw new Error(`Node not found: ${nodeID}`)
  return {
    id: node.id,
    name: node.label,
    description: node.description,
    purpose: node.description,
    requiredCapabilities: [],
    preferredKnowledge: [],
    executionPriority: 1,
    supportsParallelExecution: false,
    contract: { requires: [], consumes: [], produces: [] },
  } as const
}

function recoveryWithConfig() {
  return { maxRetries: 3, retryDelayMs: 500, timeoutMs: 15000 }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ run })
  }),
)

export { layer }
