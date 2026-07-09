import { Effect } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile, SpecialistContract, SpecialistLifecycle, SpecialistDecisionRules, SpecialistModelRequirements } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import { RepositoryIntelligence } from "../intelligence/repository-intelligence"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/repository",
  name: "Repository Specialist",
  description: "Analyzes repository structure, project layout, and code organization",
  purpose: "Understand the overall repository before detailed work",
  mission: "Build a comprehensive mental model of the repository for all downstream specialists",
  primaryObjective: "Produce repository summary, project structure, and identify key entry points",
  responsibilities: "Repository analysis, structure mapping, entry point identification, technology detection",
  requiredCapabilities: ["repository-understanding", "analysis"],
  preferredKnowledge: ["repository-summary", "project-structure", "architecture-summary", "relevant-files"],
  knowledgeSources: ["filesystem-structure", "project-config-files", "build-files"],
  executionPriority: 1,
  supportsParallelExecution: false,
  contract: {
    requires: ["repository-understanding"],
    consumes: ["project-path"],
    produces: ["repository-summary", "project-structure"],
    provides: ["project-overview", "technology-stack", "entry-points"],
    validates: ["structure-consistency"],
    reviews: ["architecture-foundation"],
    approves: ["repository-understanding-complete"],
    dependsOn: [],
    canExecuteInParallel: false, canExecuteSequentially: true,
    canSkip: false, canReuse: true, canRetry: true, canEscalate: false,
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
    preferredQualityScore: 0.8, preferredContextTokens: 16000,
    requiresStreaming: false, requiresVerification: false,
    requiresSearch: false, requiresPlanning: false,
  },
  expertise: ["project-structure-analysis", "technology-detection", "build-system-understanding"],
  produces: ["repository-summary", "project-structure", "technology-report"],
  consumes: ["project-path", "filesystem-structure"],
  requires: ["repository-access"],
  preferredCapabilities: ["repository-understanding", "analysis"],
  optionalCapabilities: ["long-context"],
  secondaryCapabilities: ["search"],
  fallbackCapabilities: ["reasoning"],
  specialistStrengths: ["large-repository-mapping", "technology-stack-detection", "entry-point-identification"],
  specialistWeaknesses: ["deep-code-semantics", "runtime-behavior"],
  specialistPreferences: ["top-down-analysis", "config-first-approach"],
  maximumContext: 8000, priorityWeight: 1.0, confidenceWeight: 0.8,
  executionCost: 2, expectedRuntimeMs: 5000,
  recoveryStrategy: "fallback-to-basic-structure-scan",
  retryPolicy: "linear-backoff-max-2", timeoutPolicy: "return-partial-structure",
  maxRetries: 2, timeoutMs: 30000,
  reviewRequirements: ["architecture-review"],
  reviewResponsibilities: ["repository-foundation"],
  approvalRequirements: [], memoryRequirements: ["cache-repository-summary", "session-scoped"],
  cachePolicy: "ttl-600s-session-scoped",
  collaborationRules: ["provide-foundation-to-all-specialists", "accept-refinement-requests-from-architecture-specialist"],
  validationRules: ["validate-directory-exists", "validate-config-files-parseable", "verify-technology-detection"],
  metrics: ["structure-analysis-time", "file-count", "technology-count", "cache-hit-rate"],
  diagnostics: ["directory-traversal-time", "config-parsing-time", "technology-detection-time"],
}

const contract: SpecialistContract = profile.contract
const lifecycle: SpecialistLifecycle = profile.lifecycle!
const decisionRules: SpecialistDecisionRules = profile.decisionRules!
const modelRequirements: SpecialistModelRequirements = profile.modelRequirements!

function canHandle(taskType: TaskType): boolean {
  return ["code-review", "refactor", "architecture", "research", "planning"].includes(taskType)
}

function synthesizeKnowledge(bundle: KnowledgeBundle, knowledgeType: string, specialistID: string, timestamp: number): CollectedKnowledgeEntry | undefined {
  switch (knowledgeType) {
    case "repository-summary":
      if (bundle.repositorySummary) return { type: knowledgeType, content: bundle.repositorySummary, source: specialistID, confidence: 0.7, timestamp }
      break
    case "project-structure":
      if (bundle.projectStructure) return { type: knowledgeType, content: bundle.projectStructure.join("\n"), source: specialistID, confidence: 0.5, timestamp }
      break
    case "architecture-summary":
      if (bundle.architectureSummary) return { type: knowledgeType, content: bundle.architectureSummary, source: specialistID, confidence: 0.7, timestamp }
      break
    case "relevant-files":
      if (bundle.relevantFiles.length > 0) return { type: knowledgeType, content: bundle.relevantFiles.join("\n"), source: specialistID, confidence: 0.6, timestamp }
      break
  }
  return undefined
}

export const make = Effect.fn("RepositorySpecialist.make")(function* () {
  const getContract = () => contract
  const getLifecycle = () => lifecycle
  const getDecisionRules = () => decisionRules
  const getModelRequirements = () => modelRequirements

  const execute = Effect.fn("RepositorySpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const repositoryIntelligence = yield* RepositoryIntelligence.Service
    const startTime = Date.now()
    const intelligence = yield* repositoryIntelligence.analyze(execInput.bundle)
    const collectedKnowledge: CollectedKnowledgeEntry[] = []

    for (const knowledgeType of profile.preferredKnowledge) {
      const entry = synthesizeKnowledge(execInput.bundle, knowledgeType, profile.id, startTime)
      if (entry) collectedKnowledge.push(entry)
    }

    const confidence = Math.max(intelligence.hotspots.length > 0 ? 0.7 : 0.5, 0.5)
    const endTime = Date.now()

    const result: SpecialistResult = {
      specialistID: profile.id,
      specialistName: profile.name,
      executionTime: endTime - startTime,
      startTime, endTime, confidence,
      capabilitiesUsed: profile.requiredCapabilities,
      collectedKnowledge,
      contextUsed: intelligence.enrichedSummary,
      modelCandidate: undefined,
      warnings: [],
      errors: [],
      metadata: { executionPhase: "specialist-execution", intelligenceType: "repository" },
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
    execute: execute as BaseSpecialistInterface["execute"],
    review,
    validate,
    canHandle,
    getContract,
    getLifecycle,
    getDecisionRules,
    getModelRequirements,
  }

  const registry = yield* SpecialistRegistry.Service
  yield* registry.registerSpecialist(specialist)

  return specialist
})

export type RepositorySpecialistInstance = BaseSpecialistInterface
