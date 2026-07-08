export * as ExecutionPackageBuilder from "./execution-package-builder"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"
import { empty as emptyPackage } from "./execution-package"
import type { AgentSelectionAdvice } from "./agent-selection-advice"
import type { AgentHints } from "./agent-hints"
import type { AgentContextProfile } from "./agent-context"
import type { PromptAugmentation } from "./prompt-augmentation"

export interface BuildInput {
  readonly sessionID: string
  readonly taskClassification: ExecutionPackage["taskClassification"]
  readonly classifications: ExecutionPackage["classifications"]
  readonly confidence: ExecutionPackage["confidence"]
  readonly confidenceScore: ExecutionPackage["confidenceScore"]
  readonly capabilityPlan: ExecutionPackage["capabilityPlan"]
  readonly specialistPlan: ExecutionPackage["specialistPlan"]
  readonly knowledgePlan: ExecutionPackage["knowledgePlan"]
  readonly dispatchPlan: ExecutionPackage["dispatchPlan"]
  readonly planningPolicy: ExecutionPackage["planningPolicy"]
  readonly executionGraph: ExecutionPackage["executionGraph"]
  readonly knowledgeBundle: ExecutionPackage["knowledgeBundle"]
  readonly repositoryIntelligence: ExecutionPackage["repositoryIntelligence"]
  readonly dependencyIntelligence: ExecutionPackage["dependencyIntelligence"]
  readonly architectureIntelligence: ExecutionPackage["architectureIntelligence"]
  readonly documentationIntelligence: ExecutionPackage["documentationIntelligence"]
  readonly verificationIntelligence: ExecutionPackage["verificationIntelligence"]
  readonly contextIntelligence: ExecutionPackage["contextIntelligence"]
  readonly runtimeMetrics: ExecutionPackage["runtimeMetrics"]
  readonly executionNotes: ExecutionPackage["executionNotes"]
}

export interface Interface {
  readonly build: (input: BuildInput) => Effect.Effect<ExecutionPackage>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionPackageBuilder") {}

const build: Interface["build"] = Effect.fn("ExecutionPackageBuilder.build")(function* (input) {
  const pkg = emptyPackage(input.sessionID)

  pkg.taskClassification = input.taskClassification
  pkg.classifications = input.classifications
  pkg.confidence = input.confidence
  pkg.confidenceScore = input.confidenceScore
  pkg.capabilityPlan = input.capabilityPlan
  pkg.specialistPlan = input.specialistPlan
  pkg.knowledgePlan = input.knowledgePlan
  pkg.dispatchPlan = input.dispatchPlan
  pkg.planningPolicy = input.planningPolicy
  pkg.executionGraph = input.executionGraph
  pkg.knowledgeBundle = input.knowledgeBundle
  pkg.repositoryIntelligence = input.repositoryIntelligence
  pkg.dependencyIntelligence = input.dependencyIntelligence
  pkg.architectureIntelligence = input.architectureIntelligence
  pkg.documentationIntelligence = input.documentationIntelligence
  pkg.verificationIntelligence = input.verificationIntelligence
  pkg.contextIntelligence = input.contextIntelligence
  pkg.runtimeMetrics = input.runtimeMetrics
  pkg.executionNotes = input.executionNotes

  pkg.conversationSummary = input.knowledgeBundle.conversationSummary
  pkg.modelRecommendation = input.capabilityPlan?.reason

  return pkg
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
