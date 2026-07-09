export * as PromptAugmentation from "./prompt-augmentation"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"

export type AugmentationSection =
  | "repository"
  | "architecture"
  | "dependency"
  | "documentation"
  | "verification"
  | "context"
  | "planning"
  | "risks"
  | "recommendations"
  | "constraints"
  | "workflow"
  | "team"
  | "reasoning"
  | "connector"

export interface PromptAugmentation {
  readonly repositorySummary: string | undefined
  readonly architectureNotes: string | undefined
  readonly dependencyNotes: string | undefined
  readonly verificationNotes: string | undefined
  readonly documentationNotes: string | undefined
  readonly contextNotes: string | undefined
  readonly planningNotes: string | undefined
  readonly reasoningNotes: string | undefined
  readonly connectorNotes: string | undefined
  readonly augmentedText: string | undefined

  readonly repositorySummarySection: string | undefined
  readonly architectureSummarySection: string | undefined
  readonly dependencySummarySection: string | undefined
  readonly documentationSummarySection: string | undefined
  readonly verificationSummarySection: string | undefined
  readonly planningSummarySection: string | undefined
  readonly reasoningSummarySection: string | undefined
  readonly connectorSummarySection: string | undefined
  readonly executionRecommendations: readonly string[] | undefined
  readonly executionRisks: readonly string[] | undefined
  readonly executionConstraints: readonly string[] | undefined
  readonly priorityFiles: readonly string[] | undefined
  readonly priorityModules: readonly string[] | undefined
  readonly suggestedWorkflow: string | undefined
  readonly specialistTeamAnalysis: string | undefined
}

export interface Interface {
  readonly build: (pkg: ExecutionPackage) => Effect.Effect<PromptAugmentation>
  readonly buildWithOrder: (pkg: ExecutionPackage, order: readonly AugmentationSection[]) => Effect.Effect<PromptAugmentation>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PromptAugmentation") {}

const build: Interface["build"] = Effect.fn("PromptAugmentation.build")(function* (pkg) {
  const repo = pkg.repositoryIntelligence?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary
  const arch = pkg.architectureIntelligence?.summary ?? pkg.knowledgeBundle.architectureSummary
  const dep = pkg.dependencyIntelligence?.summary
  const ver = pkg.verificationIntelligence?.summary
  const doc = pkg.documentationIntelligence?.summary
  const ctx = pkg.contextIntelligence?.optimizedSummary ?? pkg.knowledgeBundle.contextSummary
  const plan = pkg.planningPolicy ? `Policy: max ${pkg.planningPolicy.maxSpecialists} specialists, ${pkg.planningPolicy.maxParallelism ?? 1} parallel` : undefined

  const parts: string[] = []
  if (repo) parts.push(`Repository: ${repo.slice(0, 500)}`)
  if (arch) parts.push(`Architecture: ${arch.slice(0, 500)}`)
  if (dep) parts.push(`Dependencies: ${dep.slice(0, 300)}`)
  if (ver) parts.push(`Verification: ${ver.slice(0, 300)}`)
  if (doc) parts.push(`Documentation: ${doc.slice(0, 300)}`)
  if (ctx) parts.push(`Context: ${ctx.slice(0, 300)}`)
  if (plan) parts.push(plan)

  const intel = pkg.executionIntelligence
  const executionRecommendations = intel?.executionRecommendations?.map((r) => `(${r.priority}) ${r.recommendation}`)
  const executionRisks = intel?.executionRisks?.map((r) => `[${r.severity}] ${r.risk}`)
  const executionConstraints = intel?.executionConstraints?.map((c) => `${c.type}: ${c.constraint}`)
  const priorityFiles = pkg.knowledgeBundle.relevantFiles.slice(0, 10)
  const priorityModules = pkg.architectureIntelligence?.subsystems?.slice(0, 5).map((s) => s.name) ?? []

  const narrative = pkg.executionNarrative
  const specialistTeamAnalysis = narrative
    ? [
        "========================",
        "Specialist Team Analysis",
        `Mission: ${narrative.mission ?? "-"}`,
        `Consensus: ${narrative.specialistConsensus ?? "-"}`,
        `Risks: ${narrative.risks?.join("; ") ?? "none"}`,
        `Unknowns: ${narrative.unknowns?.join("; ") ?? "none"}`,
        `Recommended Workflow: ${narrative.recommendedWorkflow ?? "-"}`,
        `Execution Strategy: ${narrative.executionStrategy ?? "-"}`,
        `Confidence: ${narrative.confidenceSummary ?? "-"}`,
        "========================",
      ].join("\n")
    : undefined

  const reasoningSummary = narrative
    ? `Objective: ${narrative.objective ?? "-"}\nDecisions: ${narrative.executionStrategy ?? "-"}\nNext Steps: ${narrative.recommendedWorkflow ?? "none"}`
    : undefined

  const connectorSummary = pkg.connectorPlan?.requests
    ? `Sources: ${pkg.connectorPlan.requests.map((r) => r.sourceType).join(", ")}\nConfidence: ${pkg.connectorResults?.reduce((a, r) => a + r.confidence, 0) ?? 0}`
    : undefined

  return {
    repositorySummary: repo?.slice(0, 500),
    architectureNotes: arch?.slice(0, 500),
    dependencyNotes: dep?.slice(0, 300),
    verificationNotes: ver?.slice(0, 300),
    documentationNotes: doc?.slice(0, 300),
    contextNotes: ctx?.slice(0, 300),
    planningNotes: plan,
    reasoningNotes: reasoningSummary?.slice(0, 500),
    connectorNotes: connectorSummary?.slice(0, 500),
    augmentedText: parts.length > 0 ? parts.join("\n\n") : undefined,

    repositorySummarySection: repo?.slice(0, 500),
    architectureSummarySection: arch?.slice(0, 500),
    dependencySummarySection: dep?.slice(0, 300),
    documentationSummarySection: doc?.slice(0, 300),
    verificationSummarySection: ver?.slice(0, 300),
    planningSummarySection: plan,
    reasoningSummarySection: reasoningSummary?.slice(0, 500),
    connectorSummarySection: connectorSummary?.slice(0, 500),
    executionRecommendations,
    executionRisks,
    executionConstraints,
    priorityFiles,
    priorityModules,
    suggestedWorkflow: intel?.workflowAdvice,
    specialistTeamAnalysis,
  }
})

const buildWithOrder: Interface["buildWithOrder"] = Effect.fn("PromptAugmentation.buildWithOrder")(function* (pkg: ExecutionPackage, order: readonly AugmentationSection[]) {
  const repo = pkg.repositoryIntelligence?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary
  const arch = pkg.architectureIntelligence?.summary ?? pkg.knowledgeBundle.architectureSummary
  const dep = pkg.dependencyIntelligence?.summary
  const ver = pkg.verificationIntelligence?.summary
  const doc = pkg.documentationIntelligence?.summary
  const ctx = pkg.contextIntelligence?.optimizedSummary ?? pkg.knowledgeBundle.contextSummary
  const plan = pkg.planningPolicy ? `Policy: max ${pkg.planningPolicy.maxSpecialists} specialists` : undefined
  const intel = pkg.executionIntelligence
  const narrative = pkg.executionNarrative

  const specialistTeamAnalysis = narrative
    ? [
        "========================",
        "Specialist Team Analysis",
        `Mission: ${narrative.mission ?? "-"}`,
        `Consensus: ${narrative.specialistConsensus ?? "-"}`,
        `Risks: ${narrative.risks?.join("; ") ?? "none"}`,
        `Unknowns: ${narrative.unknowns?.join("; ") ?? "none"}`,
        `Recommended Workflow: ${narrative.recommendedWorkflow ?? "-"}`,
        `Execution Strategy: ${narrative.executionStrategy ?? "-"}`,
        `Confidence: ${narrative.confidenceSummary ?? "-"}`,
        "========================",
      ].join("\n")
    : undefined

  const reasoningSection = narrative
    ? `Objective: ${narrative.objective ?? "-"}\nDecisions: ${narrative.executionStrategy ?? "-"}\nNext Steps: ${narrative.recommendedWorkflow ?? "none"}`
    : undefined

  const connectorSection = pkg.connectorPlan?.requests
    ? `Sources: ${pkg.connectorPlan.requests.map((r) => r.sourceType).join(", ")}\nConfidence: ${pkg.connectorResults?.reduce((a, r) => a + r.confidence, 0) ?? 0}`
    : undefined

  const sectionMap: Record<AugmentationSection, string | undefined> = {
    repository: repo?.slice(0, 500),
    architecture: arch?.slice(0, 500),
    dependency: dep?.slice(0, 300),
    documentation: doc?.slice(0, 300),
    verification: ver?.slice(0, 300),
    context: ctx?.slice(0, 300),
    planning: plan,
    risks: intel?.executionRisks?.map((r) => `[${r.severity}] ${r.risk}`).join("; "),
    recommendations: intel?.executionRecommendations?.map((r) => `(${r.priority}) ${r.recommendation}`).join("; "),
    constraints: intel?.executionConstraints?.map((c) => `${c.type}: ${c.constraint}`).join("; "),
    workflow: intel?.workflowAdvice,
    team: specialistTeamAnalysis,
    reasoning: reasoningSection,
    connector: connectorSection,
  }

  const parts = order.map((s) => sectionMap[s]).filter((v): v is string => v != null && v.length > 0)

  const executionRecommendations = intel?.executionRecommendations?.map((r) => `(${r.priority}) ${r.recommendation}`)
  const executionRisks = intel?.executionRisks?.map((r) => `[${r.severity}] ${r.risk}`)
  const executionConstraints = intel?.executionConstraints?.map((c) => `${c.type}: ${c.constraint}`)
  const priorityFiles = pkg.knowledgeBundle.relevantFiles.slice(0, 10)
  const priorityModules = pkg.architectureIntelligence?.subsystems?.slice(0, 5).map((s) => s.name) ?? []

  return {
    repositorySummary: sectionMap.repository,
    architectureNotes: sectionMap.architecture,
    dependencyNotes: sectionMap.dependency,
    verificationNotes: sectionMap.verification,
    documentationNotes: sectionMap.documentation,
    contextNotes: sectionMap.context,
    planningNotes: sectionMap.planning,
    reasoningNotes: reasoningSection,
    connectorNotes: connectorSection,
    augmentedText: parts.length > 0 ? parts.join("\n\n") : undefined,
    repositorySummarySection: sectionMap.repository,
    architectureSummarySection: sectionMap.architecture,
    dependencySummarySection: sectionMap.dependency,
    documentationSummarySection: sectionMap.documentation,
    verificationSummarySection: sectionMap.verification,
    planningSummarySection: sectionMap.planning,
    reasoningSummarySection: reasoningSection,
    connectorSummarySection: connectorSection,
    executionRecommendations,
    executionRisks,
    executionConstraints,
    priorityFiles,
    priorityModules,
    suggestedWorkflow: intel?.workflowAdvice,
    specialistTeamAnalysis,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build, buildWithOrder })
  }),
)

export { layer }
