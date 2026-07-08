export * as AgentAdapter from "./agent-adapter"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"
import type { PromptAugmentation } from "./prompt-augmentation"
import type { AgentHints } from "./agent-hints"
import type { AgentSelectionAdvice } from "./agent-selection-advice"
import type { AgentContextProfile } from "./agent-context"

export interface AdaptedAgentInput {
  readonly enrichedPrompt: string
  readonly agentHints: AgentHints | undefined
  readonly selectionAdvice: AgentSelectionAdvice | undefined
  readonly promptAugmentation: PromptAugmentation | undefined
  readonly contextProfile: AgentContextProfile | undefined
  readonly executionPackage: ExecutionPackage
}

export interface Interface {
  readonly adapt: (pkg: ExecutionPackage) => Effect.Effect<AdaptedAgentInput>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/AgentAdapter") {}

const adapt: Interface["adapt"] = Effect.fn("AgentAdapter.adapt")(function* (pkg) {
  const parts: string[] = []

  if (pkg.taskClassification) {
    parts.push(`Task Type: ${pkg.taskClassification.type} (complexity: ${pkg.taskClassification.complexity})`)
  }

  if (pkg.confidence !== "high" && pkg.confidenceScore) {
    parts.push(`Confidence: ${pkg.confidence} (${pkg.confidenceScore.score.toFixed(2)})`)
  }

  if (pkg.knowledgeBundle.repositorySummary) {
    parts.push(`Repository: ${pkg.knowledgeBundle.repositorySummary.slice(0, 300)}`)
  }

  if (pkg.knowledgeBundle.architectureSummary) {
    parts.push(`Architecture: ${pkg.knowledgeBundle.architectureSummary.slice(0, 300)}`)
  }

  const relevantFiles = pkg.knowledgeBundle.relevantFiles
  if (relevantFiles.length > 0) {
    parts.push(`Relevant Files (${relevantFiles.length}):\n${relevantFiles.slice(0, 15).map((f) => `  ${f}`).join("\n")}`)
  }

  if (pkg.knowledgeBundle.dependencyGraph.length > 0) {
    parts.push(`Dependencies: ${pkg.knowledgeBundle.dependencyGraph.length} entries`)
  }

  if (pkg.knowledgeBundle.verificationResults.length > 0) {
    const passed = pkg.knowledgeBundle.verificationResults.filter((r) => r.passed).length
    parts.push(`Verification: ${passed}/${pkg.knowledgeBundle.verificationResults.length} passed`)
  }

  if (pkg.promptAugmentation?.augmentedText) {
    parts.push(pkg.promptAugmentation.augmentedText)
  }

  return {
    enrichedPrompt: parts.join("\n\n"),
    agentHints: pkg.agentHints,
    selectionAdvice: pkg.agentSelectionAdvice,
    promptAugmentation: pkg.promptAugmentation,
    contextProfile: pkg.agentContextProfile,
    executionPackage: pkg,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ adapt })
  }),
)

export { layer }
