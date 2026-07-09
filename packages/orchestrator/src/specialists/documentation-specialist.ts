import { Effect } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import { DocumentationIntelligence } from "../intelligence/documentation-intelligence"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/documentation",
  name: "Documentation Specialist",
  description: "Reads and summarizes documentation, comments, and README files",
  purpose: "Gather documentation context for the task",
  mission: "Ensure every specialist has complete documentation context for informed decisions",
  primaryObjective: "Collect and summarize all relevant documentation, comments, and external references",
  responsibilities: "Documentation gathering, summarization, README analysis, comment extraction",
  requiredCapabilities: ["search", "long-context"],
  preferredKnowledge: ["documentation", "repository-summary", "external-references"],
  knowledgeSources: ["readme-files", "inline-comments", "api-docs", "wiki-pages"],
  executionPriority: 4,
  supportsParallelExecution: true,
  contract: {
    requires: ["search"], consumes: ["search-results"],
    produces: ["documentation", "external-references"],
    provides: ["documented-apis", "usage-guides", "setup-instructions"],
    validates: ["doc-accuracy"], reviews: ["documentation-coverage"],
    approves: [], dependsOn: ["repository-understanding"],
    canExecuteInParallel: true, canExecuteSequentially: true,
    canSkip: true, canReuse: true, canRetry: true, canEscalate: false,
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
    preferredReasoningModel: undefined, preferredSearchModel: "fast-search",
    preferredLongContextModel: "long-context", preferredFastModel: "fast-response",
    preferredCheapModel: "cheap", preferredMultimodalModel: undefined,
    preferredLatencyMs: 300, preferredCostPerToken: 0.05,
    preferredQualityScore: 0.7, preferredContextTokens: 24000,
    requiresStreaming: false, requiresVerification: false,
    requiresSearch: true, requiresPlanning: false,
  },
  expertise: ["documentation-analysis", "readme-summarization", "api-doc-extraction", "comment-analysis"],
  produces: ["documentation", "external-references", "api-docs"],
  consumes: ["search-results", "project-files"],
  requires: ["project-access"],
  preferredCapabilities: ["search", "long-context", "documentation-analysis"],
  optionalCapabilities: ["fast-response"], secondaryCapabilities: ["analysis"],
  fallbackCapabilities: ["search"],
  specialistStrengths: ["fast-documentation-scan", "comprehensive-coverage", "multi-format-support"],
  specialistWeaknesses: ["outdated-doc-detection", "implicit-knowledge"],
  specialistPreferences: ["readme-first", "api-docs-before-comments"],
  maximumContext: 8000, priorityWeight: 0.5, confidenceWeight: 0.6,
  executionCost: 1, expectedRuntimeMs: 2000,
  recoveryStrategy: "skip-and-continue", retryPolicy: "retry-once",
  timeoutPolicy: "return-what-is-available", maxRetries: 1, timeoutMs: 10000,
  reviewRequirements: ["documentation-review"],
  reviewResponsibilities: ["documentation-coverage"],
  approvalRequirements: [], memoryRequirements: ["cache-documentation", "session-scoped"],
  cachePolicy: "ttl-600s-session-scoped",
  collaborationRules: ["share-docs-with-all-specialists", "accept-focus-areas-from-planner"],
  validationRules: ["validate-doc-exists", "check-for-outdated-references"],
  metrics: ["documents-scanned", "summaries-produced", "coverage-percentage"],
  diagnostics: ["scan-time", "summarization-time", "relevance-scoring-time"],
}

function canHandle(taskType: TaskType): boolean {
  return ["research", "code-review", "refactor", "documentation"].includes(taskType)
}

function synthesizeKnowledge(bundle: KnowledgeBundle, knowledgeType: string, specialistID: string, timestamp: number): CollectedKnowledgeEntry | undefined {
  switch (knowledgeType) {
    case "documentation":
      if (bundle.documentation) return { type: knowledgeType, content: bundle.documentation.map((d) => d.path).join("\n"), source: specialistID, confidence: 0.6, timestamp }
      break
    case "repository-summary":
      if (bundle.repositorySummary) return { type: knowledgeType, content: bundle.repositorySummary, source: specialistID, confidence: 0.7, timestamp }
      break
    case "external-references":
      if (bundle.externalReferences.length > 0) return { type: knowledgeType, content: bundle.externalReferences.join("\n"), source: specialistID, confidence: 0.5, timestamp }
      break
  }
  return undefined
}

export const make = Effect.fn("DocumentationSpecialist.make")(function* () {
  const execute = Effect.fn("DocumentationSpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const documentationIntelligence = yield* DocumentationIntelligence.Service
    const startTime = Date.now()
    const intelligence = yield* documentationIntelligence.analyze(execInput.bundle)
    const collectedKnowledge: CollectedKnowledgeEntry[] = []

    for (const knowledgeType of profile.preferredKnowledge) {
      const entry = synthesizeKnowledge(execInput.bundle, knowledgeType, profile.id, startTime)
      if (entry) collectedKnowledge.push(entry)
    }

    const confidence = Math.max(intelligence.quality.length > 0 ? 0.65 : 0.4, 0.4)
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
      warnings: [], errors: [],
      metadata: { executionPhase: "specialist-execution", intelligenceType: "documentation" },
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
