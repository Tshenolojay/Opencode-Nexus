export * as AgentDispatcher from "./dispatcher"

import { Context, Effect, Layer } from "effect"
import type { TaskType } from "../types/classification"
import type { AgentRole, AgentSpec, AgentDependency, ParallelGroup, ExecutionStage, ExecutionGraph } from "../types/dispatch"
import type { SpecialistProfile, SpecialistMatch } from "../specialists/registry"
import type { Capability } from "../types/capability"

export interface DispatchPlan {
  readonly requiredAgents: readonly AgentRole[]
  readonly executionOrder: readonly AgentRole[][]
  readonly parallelGroups: readonly AgentRole[][]
  readonly knowledgeTargets: readonly string[]
  readonly agentSpecs: readonly AgentSpec[] | undefined
  readonly dependencies: readonly AgentDependency[] | undefined
  readonly parallelGroupInfo: readonly ParallelGroup[] | undefined
  readonly priority: number | undefined
  readonly estimatedCost: number | undefined
  readonly estimatedDurationMs: number | undefined
}

export function emptyDispatchPlan(): DispatchPlan {
  return {
    requiredAgents: [],
    executionOrder: [],
    parallelGroups: [],
    knowledgeTargets: [],
    agentSpecs: undefined,
    dependencies: undefined,
    parallelGroupInfo: undefined,
    priority: undefined,
    estimatedCost: undefined,
    estimatedDurationMs: undefined,
  }
}

export interface Input {
  readonly taskType: TaskType
  readonly requiresContext: boolean
  readonly requiresSearch: boolean
  readonly requiresDependencyGraph: boolean
  readonly requiresVerification: boolean
}

export interface InputRich extends Input {
  readonly complexity: number
  readonly classifications: readonly { readonly type: string; readonly confidence: number }[]
  readonly confidenceScore: number
}

export interface SpecialistPlan {
  readonly selected: readonly SpecialistMatch[]
  readonly executionOrder: readonly string[]
  readonly parallelGroups: readonly string[][]
  readonly dependencies: readonly { from: string; to: string; kind: "blocks" | "feeds" }[]
  readonly knowledgeTargets: readonly string[]
  readonly estimatedCost: number
  readonly estimatedDurationMs: number
}

export interface SpecialistPlanInput {
  readonly taskType: TaskType
  readonly specialists: readonly SpecialistMatch[]
  readonly capabilities: readonly Capability[]
  readonly requiresSearch: boolean
  readonly requiresContext: boolean
  readonly requiresDependencyGraph: boolean
  readonly requiresVerification: boolean
  readonly maxSpecialists: number
}

export interface Interface {
  readonly plan: (input: Input) => Effect.Effect<DispatchPlan>
  readonly planRich: (input: InputRich) => Effect.Effect<DispatchPlan>
  readonly planSpecialists: (input: SpecialistPlanInput) => Effect.Effect<SpecialistPlan>
  readonly buildExecutionGraph: (plan: DispatchPlan) => Effect.Effect<ExecutionGraph>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/AgentDispatcher") {}

function buildPlan(agents: AgentRole[], knowledgeTargets: string[], input: InputRich | undefined): DispatchPlan {
  const plan: DispatchPlan = {
    requiredAgents: agents,
    executionOrder: agents.includes("search") || agents.includes("dependency")
      ? [
          agents.filter((a) => a === "search" || a === "dependency"),
          agents.filter((a) => a === "context"),
          agents.filter((a) => a === "verification"),
        ]
      : [agents],
    parallelGroups: [agents.filter((a) => a === "search" || a === "dependency")].filter((g) => g.length > 0),
    knowledgeTargets,
    agentSpecs: undefined,
    dependencies: undefined,
    parallelGroupInfo: undefined,
    priority: undefined,
    estimatedCost: undefined,
    estimatedDurationMs: undefined,
  }

  if (input) {
    plan.priority = input.complexity
    plan.agentSpecs = agents.map((role, i) => ({
      role,
      priority: agents.length - i,
      dependsOn: role === "context" && agents.includes("search")
        ? ["search"]
        : role === "verification" && (agents.includes("search") || agents.includes("dependency"))
          ? [agents.find((a) => a === "search" || a === "dependency")!]
          : [],
      estimatedCost: role === "search" ? 0.03 : role === "dependency" ? 0.04 : role === "verification" ? 0.02 : 0,
      estimatedDurationMs: role === "search" ? 3000 : role === "context" ? 1000 : role === "dependency" ? 2000 : 1000,
      requiredCapabilities: role === "search"
        ? ["search"]
        : role === "context" ? ["long-context"] : role === "dependency" ? ["search"] : [],
    }))

    plan.dependencies = []
    for (const spec of plan.agentSpecs) {
      for (const dep of spec.dependsOn) {
        plan.dependencies.push({ from: spec.role, to: dep, kind: "feeds" })
      }
    }

    plan.parallelGroupInfo = plan.parallelGroups.map((group, i) => ({
      agents: group,
      description: i === 0 ? "Discovery phase" : `Phase ${i + 1}`,
    }))

    plan.estimatedCost = plan.agentSpecs.reduce((acc, s) => acc + s.estimatedCost, 0)
    plan.estimatedDurationMs = plan.agentSpecs.reduce((acc, s) => acc + s.estimatedDurationMs, 0)
  }

  return plan
}

const plan: Interface["plan"] = Effect.fn("AgentDispatcher.plan")(function* (input) {
  const agents: AgentRole[] = []
  const knowledgeTargets: string[] = []

  if (input.requiresSearch) {
    agents.push("search")
    knowledgeTargets.push("relevant-files", "search-results")
  }

  if (input.requiresContext) {
    agents.push("context")
    knowledgeTargets.push("repository-summary", "context-summary")
  }

  if (input.requiresDependencyGraph) {
    agents.push("dependency")
    knowledgeTargets.push("dependency-graph")
  }

  if (input.requiresVerification) {
    agents.push("verification")
    knowledgeTargets.push("verification-results")
  }

  return buildPlan(agents, knowledgeTargets, undefined)
})

const planRich: Interface["planRich"] = Effect.fn("AgentDispatcher.planRich")(function* (input) {
  const agents: AgentRole[] = []
  const knowledgeTargets: string[] = []

  if (input.requiresSearch) {
    agents.push("search")
    knowledgeTargets.push("relevant-files", "search-results")
  }

  if (input.requiresContext) {
    agents.push("context")
    knowledgeTargets.push("repository-summary", "context-summary")
  }

  if (input.requiresDependencyGraph) {
    agents.push("dependency")
    knowledgeTargets.push("dependency-graph")
  }

  if (input.requiresVerification) {
    agents.push("verification")
    knowledgeTargets.push("verification-results")
  }

  return buildPlan(agents, knowledgeTargets, input)
})

const planSpecialists: Interface["planSpecialists"] = Effect.fn("AgentDispatcher.planSpecialists")(function* (input) {
  const sorted = [...input.specialists]
    .filter((m) => m.matchScore > 0)
    .sort((a, b) => {
      const prioDiff = a.specialist.executionPriority - b.specialist.executionPriority
      if (prioDiff !== 0) return prioDiff
      return b.matchScore - a.matchScore
    })

  const selected = sorted.slice(0, input.maxSpecialists)
  const ids = selected.map((m) => m.specialist.id)

  const order: string[] = []
  const parallelGroups: string[][] = []
  const deps: { from: string; to: string; kind: "blocks" | "feeds" }[] = []
  const knowledgeTargets: string[] = []

  const nonParallel = selected.filter((m) => !m.specialist.supportsParallelExecution)
  const parallel = selected.filter((m) => m.specialist.supportsParallelExecution)

  for (const m of nonParallel) {
    order.push(m.specialist.id)
  }

  if (parallel.length > 0) {
    parallelGroups.push(parallel.map((m) => m.specialist.id))
  }

  for (const m of nonParallel) {
    for (const other of nonParallel) {
      if (m.specialist.executionPriority > other.specialist.executionPriority) {
        deps.push({ from: m.specialist.id, to: other.specialist.id, kind: "blocks" })
      }
    }
  }

  for (const m of selected) {
    for (const k of m.specialist.preferredKnowledge) {
      if (!knowledgeTargets.includes(k)) knowledgeTargets.push(k)
    }
  }

  const cost = selected.reduce((acc, m) => acc + 0.02, 0)
  const duration = selected.reduce((acc, m) => acc + m.specialist.executionPriority * 1000, 0)

  return { selected, executionOrder: order, parallelGroups, dependencies: deps, knowledgeTargets, estimatedCost: cost, estimatedDurationMs: duration }
})

const buildExecutionGraph: Interface["buildExecutionGraph"] = Effect.fn("AgentDispatcher.buildExecutionGraph")(function* (plan) {
  const stages: ExecutionStage[] = []

  plan.executionOrder.forEach((group, gi) => {
    const stage: ExecutionStage = {
      stageID: `stage-${gi}`,
      agents: group,
      dependsOn: gi > 0 ? [`stage-${gi - 1}`] : [],
      parallel: group.length > 1,
      knowledgeTargets: plan.knowledgeTargets,
    }
    stages.push(stage)
  })

  const graph: ExecutionGraph = {
    stages,
    parallelGroups: plan.parallelGroupInfo ?? [],
    dependencies: plan.dependencies ?? [],
    totalStages: stages.length,
  }

  return graph
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ plan, planRich, planSpecialists, buildExecutionGraph })
  }),
)

export { layer }
