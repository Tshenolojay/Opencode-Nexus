export * as SpecialistExecutor from "./specialist-executor"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import { ModelAssignment } from "./model-assignment"
import { ContextBuilder } from "./context-builder"
import type { SpecialistResult, CollectedKnowledgeEntry, ModelCandidate } from "./specialist-result"
import type { TaskType } from "../types/classification"

export interface ExecutorInput {
  readonly specialist: SpecialistProfile
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly knowledgeBundle: KnowledgeBundle
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
}

export interface Interface {
  readonly execute: (input: ExecutorInput) => Effect.Effect<SpecialistResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistExecutor") {}

const execute: Interface["execute"] = Effect.fn("SpecialistExecutor.execute")(function* (input) {
  const startTime = Date.now()
  const modelAssignment = yield* ModelAssignment.Service
  const contextBuilder = yield* ContextBuilder.Service

  const assignment = yield* modelAssignment.assign({
    specialistCapabilities: input.specialist.requiredCapabilities,
    taskComplexity: input.capabilityPlan?.highPriority.length ?? 1,
  })

  const context = yield* contextBuilder.build({
    specialist: input.specialist,
    taskObjective: input.taskObjective,
    knowledgeBundle: input.knowledgeBundle,
  })

  const collectedKnowledge: CollectedKnowledgeEntry[] = []

  for (const knowledgeType of input.specialist.preferredKnowledge) {
    const entry = synthesizeFromBundle(input.knowledgeBundle, knowledgeType, input.specialist, startTime)
    if (entry) collectedKnowledge.push(entry)
  }

  const confidence = collectedKnowledge.length > 0
    ? collectedKnowledge.reduce((acc, e) => acc + e.confidence, 0) / collectedKnowledge.length
    : 0.3

  const warnings = collectedKnowledge.length === 0
    ? [`Specialist ${input.specialist.id} produced no knowledge from available bundle`]
    : []

  const endTime = Date.now()

  const result: SpecialistResult = {
    specialistID: input.specialist.id,
    specialistName: input.specialist.name,
    executionTime: endTime - startTime,
    startTime,
    endTime,
    confidence,
    capabilitiesUsed: input.specialist.requiredCapabilities,
    collectedKnowledge,
    contextUsed: JSON.stringify(context).slice(0, 1000),
    modelCandidate: assignment.primary,
    warnings,
    errors: [],
    metadata: {
      executionPhase: "specialist-execution",
      taskType: String(input.taskType),
    },
  }

  return result
})

function synthesizeFromBundle(
  bundle: KnowledgeBundle,
  knowledgeType: string,
  specialist: SpecialistProfile,
  timestamp: number,
): CollectedKnowledgeEntry | undefined {
  switch (knowledgeType) {
    case "repository-summary":
      if (bundle.repositorySummary) return { type: knowledgeType, content: bundle.repositorySummary, source: specialist.id, confidence: 0.7, timestamp }
      break
    case "architecture-summary":
      if (bundle.architectureSummary) return { type: knowledgeType, content: bundle.architectureSummary, source: specialist.id, confidence: 0.7, timestamp }
      break
    case "relevant-files":
      if (bundle.relevantFiles.length > 0) return { type: knowledgeType, content: bundle.relevantFiles.join("\n"), source: specialist.id, confidence: 0.6, timestamp }
      break
    case "dependency-graph":
      if (bundle.dependencyGraph.length > 0) return { type: knowledgeType, content: bundle.dependencyGraph.map((d) => `${d.name}@${d.version}`).join("\n"), source: specialist.id, confidence: 0.6, timestamp }
      break
    case "documentation":
      if (bundle.documentation) return { type: knowledgeType, content: bundle.documentation.map((d) => d.path).join("\n"), source: specialist.id, confidence: 0.5, timestamp }
      break
    case "conversation-summary":
      if (bundle.conversationSummary) return { type: knowledgeType, content: bundle.conversationSummary, source: specialist.id, confidence: 0.5, timestamp }
      break
    case "project-structure":
      if (bundle.projectStructure) return { type: knowledgeType, content: bundle.projectStructure.join("\n"), source: specialist.id, confidence: 0.5, timestamp }
      break
    case "verification-targets":
      if (bundle.verificationTargets) return { type: knowledgeType, content: `Verification: ${bundle.verificationTargets.length} targets`, source: specialist.id, confidence: 0.5, timestamp }
      break
    default:
      break
  }
  return undefined
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ execute })
  }),
)

export { layer }

export type { ModelCandidate }
