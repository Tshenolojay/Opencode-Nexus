import { Effect } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import { ContextIntelligence } from "../intelligence/context-intelligence"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/context",
  name: "Context Specialist",
  description: "Manages context windows, summarizes conversation history, and optimizes prompt assembly",
  purpose: "Prepare optimal context for the primary model",
  mission: "Deliver the most relevant and concise context to maximize model effectiveness",
  primaryObjective: "Produce optimized context summary with priority-ranked information for the execution model",
  responsibilities: "Context optimization, conversation summarization, token budget management, relevance ranking",
  requiredCapabilities: ["long-context", "reasoning", "analysis"],
  preferredKnowledge: ["conversation-summary", "tool-history", "repository-summary", "architecture-summary"],
  knowledgeSources: ["session-history", "tool-execution-logs", "previous-outputs"],
  executionPriority: 4,
  supportsParallelExecution: false,
  contract: {
    requires: ["long-context", "reasoning"],
    consumes: ["conversation-history", "tool-history"],
    produces: ["context-summary", "conversation-summary"],
    provides: ["optimized-context", "token-budget-report", "relevance-ranking"],
    validates: ["context-relevance"],
    reviews: ["context-quality"],
    approves: [],
    dependsOn: ["conversation-history", "tool-history"],
    canExecuteInParallel: false, canExecuteSequentially: true,
    canSkip: true, canReuse: true, canRetry: true, canEscalate: true,
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
    canRecommendReduceContext: true, canRecommendExpandContext: false,
    canRecommendRunVerification: true, canRecommendRunDocumentationReview: false,
    canRecommendRunArchitectureReview: false, canRecommendRunDependencyReview: false,
    canRecommendRunSearch: true, canRecommendRunPlanning: false,
  },
  modelRequirements: {
    preferredReasoningModel: "reasoning", preferredSearchModel: undefined,
    preferredLongContextModel: "long-context", preferredFastModel: "fast-response",
    preferredCheapModel: "cheap", preferredMultimodalModel: undefined,
    preferredLatencyMs: 200, preferredCostPerToken: 0.05,
    preferredQualityScore: 0.75, preferredContextTokens: 32000,
    requiresStreaming: false, requiresVerification: false,
    requiresSearch: false, requiresPlanning: false,
  },
  expertise: ["context-optimization", "conversation-summarization", "token-budget-management", "relevance-scoring"],
  produces: ["context-summary", "conversation-summary", "relevance-report"],
  consumes: ["session-history", "tool-history", "previous-outputs"],
  requires: ["session-access", "tool-history-access"],
  preferredCapabilities: ["long-context", "reasoning", "analysis"],
  optionalCapabilities: ["fast-response"], secondaryCapabilities: ["search"],
  fallbackCapabilities: ["analysis"],
  specialistStrengths: ["token-efficiency", "relevance-ranking", "history-compression"],
  specialistWeaknesses: ["real-time-context", "multi-modal-context"],
  specialistPreferences: ["recency-first", "relevance-before-completeness"],
  maximumContext: 16000, priorityWeight: 0.6, confidenceWeight: 0.7,
  executionCost: 2, expectedRuntimeMs: 3000,
  recoveryStrategy: "return-full-context-without-compression",
  retryPolicy: "retry-once", timeoutPolicy: "return-uncompressed-context",
  maxRetries: 1, timeoutMs: 15000,
  reviewRequirements: ["context-quality-review"],
  reviewResponsibilities: ["context-optimization"],
  approvalRequirements: [], memoryRequirements: ["cache-context-summary", "session-scoped"],
  cachePolicy: "ttl-300s-session-scoped",
  collaborationRules: ["provide-context-to-all-specialists", "accept-priority-signals-from-planner"],
  validationRules: ["validate-token-budget", "check-relevance-scores", "verify-no-duplicate-context"],
  metrics: ["token-savings", "compression-ratio", "relevance-score", "context-build-time"],
  diagnostics: ["summarization-time", "ranking-time", "compression-time"],
}

function canHandle(taskType: TaskType): boolean {
  return ["research", "planning", "code-generation", "code-review", "debug"].includes(taskType)
}

function synthesizeKnowledge(bundle: KnowledgeBundle, knowledgeType: string, specialistID: string, timestamp: number): CollectedKnowledgeEntry | undefined {
  switch (knowledgeType) {
    case "conversation-summary":
      if (bundle.conversationSummary) return { type: knowledgeType, content: bundle.conversationSummary, source: specialistID, confidence: 0.6, timestamp }
      break
    case "tool-history":
      if (bundle.toolHistory) return { type: knowledgeType, content: bundle.toolHistory.join("\n"), source: specialistID, confidence: 0.5, timestamp }
      break
    case "repository-summary":
      if (bundle.repositorySummary) return { type: knowledgeType, content: bundle.repositorySummary, source: specialistID, confidence: 0.7, timestamp }
      break
    case "architecture-summary":
      if (bundle.architectureSummary) return { type: knowledgeType, content: bundle.architectureSummary, source: specialistID, confidence: 0.7, timestamp }
      break
  }
  return undefined
}

export const make = Effect.fn("ContextSpecialist.make")(function* () {
  const execute = Effect.fn("ContextSpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const contextIntelligence = yield* ContextIntelligence.Service
    const startTime = Date.now()
    const intelligence = yield* contextIntelligence.prepare(execInput.bundle)
    const collectedKnowledge: CollectedKnowledgeEntry[] = []

    for (const knowledgeType of profile.preferredKnowledge) {
      const entry = synthesizeKnowledge(execInput.bundle, knowledgeType, profile.id, startTime)
      if (entry) collectedKnowledge.push(entry)
    }

    const confidence = Math.max(intelligence.averageConfidence, 0.4)
    const endTime = Date.now()

    const result: SpecialistResult = {
      specialistID: profile.id,
      specialistName: profile.name,
      executionTime: endTime - startTime,
      startTime, endTime, confidence,
      capabilitiesUsed: profile.requiredCapabilities,
      collectedKnowledge,
      contextUsed: intelligence.optimizedSummary,
      modelCandidate: undefined,
      warnings: intelligence.missingCriticalFields.length > 0 ? intelligence.missingCriticalFields.map((f) => `Missing critical field: ${f}`) : [],
      errors: [],
      metadata: { executionPhase: "specialist-execution", intelligenceType: "context" },
    }
    return result
  })

  const review = (result: SpecialistResult): Effect.Effect<ReviewVerdict> =>
    Effect.succeed(
      result.warnings.length > 0 && result.confidence < 0.3 ? "needs-escalation" as const :
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
