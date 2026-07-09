import { Effect } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import { ArchitectureIntelligence } from "../intelligence/architecture-intelligence"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/architecture",
  name: "Architecture Specialist",
  description: "Analyzes system architecture, component relationships, and design patterns",
  purpose: "Understand the architectural context before making changes",
  mission: "Provide architectural clarity and ensure all changes align with system design",
  primaryObjective: "Produce architecture summary with component relationships, patterns, and constraints",
  responsibilities: "Architecture analysis, pattern detection, component relationship mapping, constraint identification",
  requiredCapabilities: ["repository-understanding", "analysis", "reasoning"],
  preferredKnowledge: ["architecture-summary", "repository-summary", "dependency-graph", "conversation-summary"],
  knowledgeSources: ["repository-structure", "dependency-graph", "design-patterns", "module-boundaries"],
  executionPriority: 2,
  supportsParallelExecution: false,
  contract: {
    requires: ["repository-understanding", "analysis"],
    consumes: ["repository-summary", "dependency-graph"],
    produces: ["architecture-summary", "architecture-notes"],
    provides: ["component-map", "pattern-analysis", "architectural-constraints"],
    validates: ["architectural-consistency"],
    reviews: ["architecture-design"],
    approves: ["architecture-decisions"],
    dependsOn: ["repository-understanding", "dependency-graph"],
    canExecuteInParallel: false, canExecuteSequentially: true,
    canSkip: false, canReuse: true, canRetry: true, canEscalate: true,
  },
  lifecycle: {
    planning: ["assess-input", "determine-approach"],
    preparation: ["load-required-knowledge", "prepare-context"],
    execution: ["perform-analysis", "collect-findings"],
    validation: ["validate-findings", "cross-reference-sources"],
    knowledgeProduction: ["produce-summary", "produce-notes"],
    review: ["submit-for-review"],
    completion: ["finalize-output", "tag-for-reuse"],
    reuse: ["check-cached-output"],
    recovery: ["retry-with-adjusted-parameters"],
    cancellation: ["abort-analysis", "cleanup"],
    failure: ["log-failure", "return-error-summary"],
    timeout: ["return-partial-findings"],
  },
  decisionRules: {
    canRecommendContinue: true, canRecommendRetry: true, canRecommendEscalate: true,
    canRecommendStop: false, canRecommendCollectMoreKnowledge: true,
    canRecommendReduceContext: false, canRecommendExpandContext: true,
    canRecommendRunVerification: true, canRecommendRunDocumentationReview: false,
    canRecommendRunArchitectureReview: false, canRecommendRunDependencyReview: false,
    canRecommendRunSearch: true, canRecommendRunPlanning: false,
  },
  modelRequirements: {
    preferredReasoningModel: "reasoning", preferredSearchModel: undefined,
    preferredLongContextModel: "long-context", preferredFastModel: undefined,
    preferredCheapModel: undefined, preferredMultimodalModel: undefined,
    preferredLatencyMs: undefined, preferredCostPerToken: undefined,
    preferredQualityScore: 0.85, preferredContextTokens: 12000,
    requiresStreaming: false, requiresVerification: false,
    requiresSearch: false, requiresPlanning: false,
  },
  expertise: ["pattern-detection", "component-relationship-analysis", "architectural-constraint-identification", "design-decision-capture"],
  produces: ["architecture-summary", "architecture-notes", "pattern-report"],
  consumes: ["repository-summary", "dependency-graph", "project-structure"],
  requires: ["repository-understanding", "dependency-graph"],
  preferredCapabilities: ["repository-understanding", "analysis", "reasoning", "architecture-analysis"],
  optionalCapabilities: ["long-context"],
  secondaryCapabilities: ["planning"],
  fallbackCapabilities: ["reasoning"],
  specialistStrengths: ["pattern-recognition", "component-boundary-detection", "constraint-identification"],
  specialistWeaknesses: ["runtime-architecture", "deployment-architecture"],
  specialistPreferences: ["top-down-analysis", "pattern-first"],
  maximumContext: 8000, priorityWeight: 0.9, confidenceWeight: 0.8,
  executionCost: 3, expectedRuntimeMs: 5000,
  recoveryStrategy: "fallback-to-component-level-analysis",
  retryPolicy: "exponential-backoff-max-2", timeoutPolicy: "return-partial-architecture",
  maxRetries: 2, timeoutMs: 30000,
  reviewRequirements: ["peer-architecture-review"],
  reviewResponsibilities: ["architecture-integrity"],
  approvalRequirements: ["architecture-approval-for-major-changes"],
  memoryRequirements: ["cache-architecture-summary", "session-scoped"],
  cachePolicy: "ttl-600s-session-scoped",
  collaborationRules: ["provide-foundation-to-planning-specialist", "accept-refinement-from-repository-specialist"],
  validationRules: ["validate-component-boundaries", "check-pattern-consistency", "verify-constraint-documentation"],
  metrics: ["component-count", "pattern-count", "constraint-count", "architecture-confidence"],
  diagnostics: ["pattern-detection-time", "relationship-mapping-time", "constraint-analysis-time"],
}

function canHandle(taskType: TaskType): boolean {
  return ["architecture", "code-review", "refactor", "planning"].includes(taskType)
}

function synthesizeKnowledge(bundle: KnowledgeBundle, knowledgeType: string, specialistID: string, timestamp: number): CollectedKnowledgeEntry | undefined {
  switch (knowledgeType) {
    case "architecture-summary":
      if (bundle.architectureSummary) return { type: knowledgeType, content: bundle.architectureSummary, source: specialistID, confidence: 0.8, timestamp }
      break
    case "repository-summary":
      if (bundle.repositorySummary) return { type: knowledgeType, content: bundle.repositorySummary, source: specialistID, confidence: 0.7, timestamp }
      break
    case "dependency-graph":
      if (bundle.dependencyGraph.length > 0) return { type: knowledgeType, content: bundle.dependencyGraph.map((d) => `${d.name}@${d.version}`).join("\n"), source: specialistID, confidence: 0.6, timestamp }
      break
    case "conversation-summary":
      if (bundle.conversationSummary) return { type: knowledgeType, content: bundle.conversationSummary, source: specialistID, confidence: 0.5, timestamp }
      break
  }
  return undefined
}

export const make = Effect.fn("ArchitectureSpecialist.make")(function* () {
  const execute = Effect.fn("ArchitectureSpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const architectureIntelligence = yield* ArchitectureIntelligence.Service
    const startTime = Date.now()
    const intelligence = yield* architectureIntelligence.analyze(execInput.bundle)
    const collectedKnowledge: CollectedKnowledgeEntry[] = []

    for (const knowledgeType of profile.preferredKnowledge) {
      const entry = synthesizeKnowledge(execInput.bundle, knowledgeType, profile.id, startTime)
      if (entry) collectedKnowledge.push(entry)
    }

    const confidence = Math.max(intelligence.subsystems.length > 0 ? 0.75 : 0.5, 0.5)
    const endTime = Date.now()

    const result: SpecialistResult = {
      specialistID: profile.id,
      specialistName: profile.name,
      executionTime: endTime - startTime,
      startTime, endTime, confidence,
      capabilitiesUsed: profile.requiredCapabilities,
      collectedKnowledge,
      contextUsed: intelligence.summary,
      modelCandidate: undefined,
      warnings: [],
      errors: [],
      metadata: { executionPhase: "specialist-execution", intelligenceType: "architecture" },
    }
    return result
  })

  const review = (result: SpecialistResult): Effect.Effect<ReviewVerdict> =>
    Effect.succeed(
      result.collectedKnowledge.length === 0 ? "needs-escalation" as const :
      result.confidence < 0.3 ? "changes-requested" as const :
      "approved" as const
    )

  const validate = (result: SpecialistResult): Effect.Effect<ValidationResult> =>
    Effect.succeed({
      entries: result.collectedKnowledge.map((entry) => ({
        specialistID: profile.id,
        sourceEntry: entry,
        status: entry.confidence >= 0.4 ? "valid" as const : "uncertain" as const,
        confidence: entry.confidence,
        issues: entry.confidence < 0.4 ? ["low confidence"] : [],
        evidence: [],
      })),
      validCount: result.collectedKnowledge.filter((e) => e.confidence >= 0.4).length,
      invalidCount: 0,
      uncertainCount: result.collectedKnowledge.filter((e) => e.confidence < 0.4).length,
      rejectedEntries: result.collectedKnowledge.filter((e) => e.confidence < 0.2),
    })

  const specialist: BaseSpecialistInterface = {
    id: profile.id,
    profile,
    execute: execute as BaseSpecialistInterface["execute"], review, validate,
    canHandle,
    getContract: () => profile.contract,
    getLifecycle: () => profile.lifecycle!,
    getDecisionRules: () => profile.decisionRules!,
    getModelRequirements: () => profile.modelRequirements!,
  }

  const registry = yield* SpecialistRegistry.Service
  yield* registry.registerSpecialist(specialist)

  return specialist
})
