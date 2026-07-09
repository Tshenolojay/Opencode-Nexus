import { Effect } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import { VerificationIntelligence } from "../intelligence/verification-intelligence"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/verification",
  name: "Verification Specialist",
  description: "Verifies correctness of code changes, runs validation checks",
  purpose: "Ensure task requirements are met and no regressions introduced",
  mission: "Guarantee every change meets quality standards without introducing regressions",
  primaryObjective: "Run comprehensive verification and produce a clear pass/fail report with evidence",
  responsibilities: "Requirement verification, regression checking, quality validation, test coverage analysis",
  requiredCapabilities: ["analysis", "tool-use", "code-generation"],
  preferredKnowledge: ["verification-targets", "relevant-files", "execution-notes"],
  knowledgeSources: ["test-files", "verification-targets", "quality-reports"],
  executionPriority: 6,
  supportsParallelExecution: false,
  contract: {
    requires: ["analysis", "code-generation"],
    consumes: ["relevant-files", "execution-notes"],
    produces: ["verification-results", "verification-notes"],
    provides: ["pass-fail-report", "regression-analysis", "quality-score"],
    validates: ["task-requirements", "code-correctness"],
    reviews: ["verification-readiness"],
    approves: ["verification-pass"],
    dependsOn: ["execution-notes", "relevant-files"],
    canExecuteInParallel: false, canExecuteSequentially: true,
    canSkip: false, canReuse: false, canRetry: true, canEscalate: true,
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
    canRecommendStop: true, canRecommendCollectMoreKnowledge: true,
    canRecommendReduceContext: false, canRecommendExpandContext: true,
    canRecommendRunVerification: false, canRecommendRunDocumentationReview: false,
    canRecommendRunArchitectureReview: false, canRecommendRunDependencyReview: false,
    canRecommendRunSearch: true, canRecommendRunPlanning: false,
  },
  modelRequirements: {
    preferredReasoningModel: "reasoning", preferredSearchModel: undefined,
    preferredLongContextModel: undefined, preferredFastModel: "fast-response",
    preferredCheapModel: undefined, preferredMultimodalModel: undefined,
    preferredLatencyMs: undefined, preferredCostPerToken: undefined,
    preferredQualityScore: 0.9, preferredContextTokens: 8000,
    requiresStreaming: false, requiresVerification: true,
    requiresSearch: false, requiresPlanning: false,
  },
  expertise: ["test-analysis", "regression-detection", "quality-validation", "requirement-verification"],
  produces: ["verification-results", "verification-notes", "quality-report"],
  consumes: ["relevant-files", "execution-notes", "test-results"],
  requires: ["execution-context", "test-access"],
  preferredCapabilities: ["analysis", "tool-use", "code-generation", "verification"],
  optionalCapabilities: ["fast-response"], secondaryCapabilities: ["reasoning"],
  fallbackCapabilities: ["analysis"],
  specialistStrengths: ["thorough-verification", "regression-detection", "edge-case-identification"],
  specialistWeaknesses: ["false-positive-reduction", "performance-testing"],
  specialistPreferences: ["requirements-first", "edge-cases-before-happy-path"],
  maximumContext: 6000, priorityWeight: 0.9, confidenceWeight: 0.9,
  executionCost: 4, expectedRuntimeMs: 8000,
  recoveryStrategy: "isolate-failing-checks-and-retry",
  retryPolicy: "retry-failed-checks-max-2", timeoutPolicy: "return-current-results-as-fail",
  maxRetries: 2, timeoutMs: 30000,
  reviewRequirements: ["verification-review"],
  reviewResponsibilities: ["verification-integrity"],
  approvalRequirements: ["verification-approval-required"],
  memoryRequirements: ["cache-verification-results", "session-scoped"],
  cachePolicy: "no-cache",
  collaborationRules: ["request-clarification-from-planner", "report-blocking-issues-to-coordinator"],
  validationRules: ["validate-requirements-are-testable", "check-regression-coverage"],
  metrics: ["tests-passed", "tests-failed", "coverage-percentage", "verification-time"],
  diagnostics: ["test-execution-time", "result-analysis-time", "report-generation-time"],
}

function canHandle(taskType: TaskType): boolean {
  return ["test", "code-review", "debug", "refactor", "code-generation"].includes(taskType)
}

function synthesizeKnowledge(bundle: KnowledgeBundle, knowledgeType: string, specialistID: string, timestamp: number): CollectedKnowledgeEntry | undefined {
  switch (knowledgeType) {
    case "verification-targets":
      if (bundle.verificationTargets) return { type: knowledgeType, content: `Verification: ${bundle.verificationTargets.length} targets`, source: specialistID, confidence: 0.7, timestamp }
      break
    case "relevant-files":
      if (bundle.relevantFiles.length > 0) return { type: knowledgeType, content: bundle.relevantFiles.join("\n"), source: specialistID, confidence: 0.6, timestamp }
      break
    case "execution-notes":
      if (bundle.executionNotes) return { type: knowledgeType, content: bundle.executionNotes.join("\n"), source: specialistID, confidence: 0.5, timestamp }
      break
  }
  return undefined
}

export const make = Effect.fn("VerificationSpecialist.make")(function* () {
  const execute = Effect.fn("VerificationSpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const verificationIntelligence = yield* VerificationIntelligence.Service
    const startTime = Date.now()
    const intelligence = yield* verificationIntelligence.analyze(execInput.bundle)
    const collectedKnowledge: CollectedKnowledgeEntry[] = []

    for (const knowledgeType of profile.preferredKnowledge) {
      const entry = synthesizeKnowledge(execInput.bundle, knowledgeType, profile.id, startTime)
      if (entry) collectedKnowledge.push(entry)
    }

    const confidence = Math.max(intelligence.confidence, 0.4)
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
      warnings: intelligence.unresolvedIssues.length > 0 ? intelligence.unresolvedIssues.map((i) => `Unresolved: ${i}`) : [],
      errors: [],
      metadata: { executionPhase: "specialist-execution", intelligenceType: "verification" },
    }
    return result
  })

  const review = (result: SpecialistResult): Effect.Effect<ReviewVerdict> =>
    Effect.succeed(
      result.warnings.length > 0 && result.confidence < 0.4 ? "failed" as const :
      result.confidence < 0.3 ? "changes-requested" as const :
      result.warnings.length > 0 ? "needs-escalation" as const :
      "approved" as const
    )

  const validate = (result: SpecialistResult): Effect.Effect<ValidationResult> =>
    Effect.succeed({
      entries: result.collectedKnowledge.map((entry) => ({
        specialistID: profile.id,
        sourceEntry: entry,
        status: entry.confidence >= 0.5 ? "valid" as const : "uncertain" as const,
        confidence: entry.confidence,
        issues: entry.confidence < 0.5 ? ["low confidence"] : [],
        evidence: [],
      })),
      validCount: result.collectedKnowledge.filter((e) => e.confidence >= 0.5).length,
      invalidCount: result.collectedKnowledge.filter((e) => e.confidence < 0.2).length,
      uncertainCount: result.collectedKnowledge.filter((e) => e.confidence >= 0.2 && e.confidence < 0.5).length,
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
