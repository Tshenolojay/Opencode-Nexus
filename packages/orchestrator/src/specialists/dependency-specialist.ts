import { Effect } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"
import type { SpecialistProfile } from "./profiles"
import type { BaseSpecialistInterface, ReviewVerdict, SpecialistExecutionInput } from "./base-specialist"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { TaskType } from "../types/classification"
import { DependencyIntelligence } from "../intelligence/dependency-intelligence"
import { SpecialistRegistry } from "./registry"

export const profile: SpecialistProfile = {
  id: "specialist/dependency",
  name: "Dependency Specialist",
  description: "Analyzes project dependencies, imports, and module relationships",
  purpose: "Understand dependency graph and module interactions",
  mission: "Map all module relationships and identify dependency risks before code changes",
  primaryObjective: "Produce complete dependency graph with critical path and risk analysis",
  responsibilities: "Dependency analysis, import resolution, circular dependency detection, version conflict identification",
  requiredCapabilities: ["search", "analysis"],
  preferredKnowledge: ["dependency-graph", "project-structure", "configuration"],
  knowledgeSources: ["import-statements", "package-configs", "module-files"],
  executionPriority: 3,
  supportsParallelExecution: true,
  contract: {
    requires: ["search"], consumes: ["project-structure"],
    produces: ["dependency-graph", "dependencies"],
    provides: ["dependency-map", "critical-path", "circular-dependency-warnings"],
    validates: ["dependency-integrity"], reviews: ["dependency-impact"],
    approves: [], dependsOn: ["repository-understanding"],
    canExecuteInParallel: true, canExecuteSequentially: true,
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
    preferredReasoningModel: "reasoning", preferredSearchModel: "fast-search",
    preferredLongContextModel: undefined, preferredFastModel: undefined,
    preferredCheapModel: "cheap", preferredMultimodalModel: undefined,
    preferredLatencyMs: 400, preferredCostPerToken: 0.08,
    preferredQualityScore: 0.75, preferredContextTokens: 8000,
    requiresStreaming: false, requiresVerification: false,
    requiresSearch: true, requiresPlanning: false,
  },
  expertise: ["dependency-graph-analysis", "import-resolution", "circular-dependency-detection", "version-conflict-detection"],
  produces: ["dependency-graph", "dependencies", "dependency-warnings"],
  consumes: ["project-structure", "package-configs"],
  requires: ["project-access"],
  preferredCapabilities: ["search", "analysis", "dependency-analysis"],
  optionalCapabilities: ["fast-response"], secondaryCapabilities: ["reasoning"],
  fallbackCapabilities: ["search"],
  specialistStrengths: ["fast-import-resolution", "circular-dependency-detection", "version-conflict-detection"],
  specialistWeaknesses: ["runtime-dependency-detection", "dynamic-imports"],
  specialistPreferences: ["bottom-up-analysis", "config-first"],
  maximumContext: 4000, priorityWeight: 0.7, confidenceWeight: 0.8,
  executionCost: 1, expectedRuntimeMs: 3000,
  recoveryStrategy: "isolate-dependency-scope-and-retry",
  retryPolicy: "exponential-backoff-max-2", timeoutPolicy: "return-partial-graph",
  maxRetries: 2, timeoutMs: 15000,
  reviewRequirements: ["dependency-review"],
  reviewResponsibilities: ["dependency-integrity"],
  approvalRequirements: [], memoryRequirements: ["cache-dependency-graph", "session-scoped"],
  cachePolicy: "ttl-600s-session-scoped",
  collaborationRules: ["share-graph-with-architecture-specialist", "accept-scope-refinement-from-planner"],
  validationRules: ["validate-import-resolves", "check-for-circular-dependencies", "verify-version-consistency"],
  metrics: ["graph-build-time", "node-count", "edge-count", "circular-dependency-count"],
  diagnostics: ["import-resolution-time", "graph-traversal-time", "validation-time"],
}

function canHandle(taskType: TaskType): boolean {
  return ["dependency-management", "refactor", "architecture", "research"].includes(taskType)
}

function synthesizeKnowledge(bundle: KnowledgeBundle, knowledgeType: string, specialistID: string, timestamp: number): CollectedKnowledgeEntry | undefined {
  switch (knowledgeType) {
    case "dependency-graph":
      if (bundle.dependencyGraph.length > 0) return { type: knowledgeType, content: bundle.dependencyGraph.map((d) => `${d.name}@${d.version}`).join("\n"), source: specialistID, confidence: 0.7, timestamp }
      break
    case "project-structure":
      if (bundle.projectStructure) return { type: knowledgeType, content: bundle.projectStructure.join("\n"), source: specialistID, confidence: 0.5, timestamp }
      break
  }
  return undefined
}

export const make = Effect.fn("DependencySpecialist.make")(function* () {
  const execute = Effect.fn("DependencySpecialist.execute")(function* (execInput: SpecialistExecutionInput) {
    const dependencyIntelligence = yield* DependencyIntelligence.Service
    const startTime = Date.now()
    const intelligence = yield* dependencyIntelligence.analyze(execInput.bundle)
    const collectedKnowledge: CollectedKnowledgeEntry[] = []

    for (const knowledgeType of profile.preferredKnowledge) {
      const entry = synthesizeKnowledge(execInput.bundle, knowledgeType, profile.id, startTime)
      if (entry) collectedKnowledge.push(entry)
    }

    const confidence = Math.max(intelligence.blastRadius > 0 ? 0.7 : 0.4, 0.4)
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
      metadata: { executionPhase: "specialist-execution", intelligenceType: "dependency" },
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
