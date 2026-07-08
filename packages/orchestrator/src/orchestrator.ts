export * as OrchestratorService from "./orchestrator"

import { Context, Effect, Layer } from "effect"
import type { OrchestrationInput, OrchestrationDecision } from "./contracts/service"
import { TaskClassifier } from "./classifier/classifier"
import { ConfidenceEngine } from "./confidence/confidence"
import { AgentDispatcher } from "./dispatcher/dispatcher"
import { ModelSelector } from "./selector/selector"
import { KnowledgeBundle } from "./knowledge/knowledge"
import type { KnowledgePlanMetadata } from "./knowledge/knowledge"
import type { ExecutionGraph as DispatchExecutionGraph } from "./types/dispatch"
import { TaskType } from "./types/classification"
import { ConfidenceLevel } from "./types/confidence"
import { ExecutionStatus } from "./types/execution-status"
import type { TimingInfo } from "./types/metadata"
import { CapabilityPlanner } from "./planner/capability-planner"
import { SpecialistRegistry } from "./specialists/registry"
import { KnowledgePlanner } from "./planner/knowledge-planner"
import { ExecutionGraph as ExecutionGraphBuilder } from "./planner/execution-graph"
import { PlanningPolicy as PlanningPolicyService } from "./planner/planning-policy"
import { PlanningMemory } from "./planner/planning-memory"
import { SpecialistRunner } from "./execution/specialist-runner"
import { KnowledgeCollector } from "./execution/knowledge-collector"
import { KnowledgeMerger } from "./execution/knowledge-merger"
import { RuntimeManager } from "./runtime/runtime-manager"
import { RuntimeContext } from "./runtime/runtime-context"
import { PromptBuilder } from "./prompts/prompt-builder"
import { RepositoryIntelligence } from "./intelligence/repository-intelligence"
import { ContextIntelligence } from "./intelligence/context-intelligence"
import { DependencyIntelligence } from "./intelligence/dependency-intelligence"
import { DocumentationIntelligence } from "./intelligence/documentation-intelligence"
import { ArchitectureIntelligence } from "./intelligence/architecture-intelligence"
import { VerificationIntelligence } from "./intelligence/verification-intelligence"
import { KnowledgeValidator } from "./intelligence/knowledge-validator"
import { RankingEngine } from "./intelligence/ranking-engine"
import type { ExecutionPackage } from "./integration/execution-package"
import { empty as emptyPackage } from "./integration/execution-package"
import { ExecutionPackageBuilder } from "./integration/execution-package-builder"
import { AgentContext as AgentContextService } from "./integration/agent-context"
import { AgentHints as AgentHintsService } from "./integration/agent-hints"
import { AgentCapabilities as AgentCapabilitiesService } from "./integration/agent-capabilities"
import { AgentSelectionAdvice as AgentSelectionAdviceService } from "./integration/agent-selection-advice"
import { PromptAugmentation as PromptAugmentationService } from "./integration/prompt-augmentation"
import { AgentEnhancer } from "./integration/agent-enhancer"
import { AgentAdapter } from "./integration/agent-adapter"
export interface PhaseEntry {
  readonly phase: string
  readonly durationMs: number
  readonly result: string
  readonly error: string | undefined
}

export interface Interface {
  readonly orchestrate: (input: OrchestrationInput) => Effect.Effect<OrchestrationDecision>
  readonly orchestrateWithContext: (input: OrchestrationInput) => Effect.Effect<{
    readonly decision: OrchestrationDecision
    readonly timing: TimingInfo
    readonly diagnostics: readonly PhaseEntry[]
    readonly executionGraph: DispatchExecutionGraph | undefined
    readonly executionPackage: ExecutionPackage
  }>
  readonly skip: (input: OrchestrationInput) => Effect.Effect<OrchestrationDecision>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/Orchestrator") {}

function recordEntry(entries: PhaseEntry[], phase: string, durationMs: number, result: string): PhaseEntry[] {
  return [...entries, { phase, durationMs, result, error: undefined }]
}

export const Config = {
  minimumConfidence: 0.65,
}

const orchestrate: Interface["orchestrate"] = Effect.fn("OrchestratorService.orchestrate")(function* (input) {
  const classifier = yield* TaskClassifier.Service
  const confidence = yield* ConfidenceEngine.Service
  const dispatcher = yield* AgentDispatcher.Service
  const selector = yield* ModelSelector.Service
  const capabilityPlanner = yield* CapabilityPlanner.Service
  const specialistRegistry = yield* SpecialistRegistry.Service
  const knowledgePlanner = yield* KnowledgePlanner.Service
  const policyService = yield* PlanningPolicyService.Service

  const classification = yield* classifier.classify({
    text: input.promptText,
    filesAttached: input.filesAttached,
    conversationLength: input.conversationLength,
  })

  const richSignals = [
    { signal: "prompt-text", text: input.promptText, weight: 1.0 },
    ...(input.sessionMetadata
      ? [{ signal: "session-metadata" as const, text: JSON.stringify(input.sessionMetadata), weight: 0.3 }]
      : []),
    ...(input.assistantResponses
      ? input.assistantResponses.map((r) => ({ signal: "previous-responses" as const, text: r, weight: 0.4 }))
      : []),
    ...(input.toolResults
      ? input.toolResults.map((r) => ({ signal: "tool-results" as const, text: r, weight: 0.5 }))
      : []),
    ...(input.projectInfo
      ? [{ signal: "project-info" as const, text: input.projectInfo, weight: 0.6 }]
      : []),
  ]

  const classifications = yield* classifier.classifyRich({
    signals: richSignals,
    sessionMetadata: input.sessionMetadata,
    assistantResponses: input.assistantResponses,
    toolResults: input.toolResults,
    projectInfo: input.projectInfo,
  })

  const confidenceLevel = yield* confidence.estimate({
    classification,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    filesAttached: input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: input.contextAvailable,
    previousToolResults: input.previousToolResults,
  })

  const confidenceScore = yield* confidence.estimateWithScore({
    classification,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    filesAttached: input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: input.contextAvailable,
    previousToolResults: input.previousToolResults,
    classifications,
    sessionMetadata: input.sessionMetadata,
    toolHistory: input.toolResults,
  })

  if (confidenceLevel === "high") {
    return {
      needsOrchestration: false,
      taskClassification: classification,
      confidence: confidenceLevel,
      confidenceScore,
      dispatchPlan: AgentDispatcher.emptyDispatchPlan(),
      knowledgeBundle: KnowledgeBundle.empty(classification.type),
      executionStatus: "completed",
      skipReason: "high confidence — no specialist agents needed",
      selectedCapabilities: undefined,
      knowledgeRequirements: undefined,
      executionNotes: undefined,
      specialistPlan: undefined,
      capabilityPlan: undefined,
      knowledgePlan: undefined,
      executionGraph: undefined,
      planningPolicy: undefined,
    }
  }

  const capabilityProfile = yield* selector.estimateCapabilities({
    taskType: classification.type,
    complexity: classification.complexity,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
  })

  const requiredCapabilities = capabilityProfile.requirements
    .filter((r) => !r.optional)
    .map((r) => r.capability)

  const capabilityPlan = yield* capabilityPlanner.plan({
    taskClassification: classification,
    classifications,
    confidence: confidenceLevel,
    confidenceScore: confidenceScore.score,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    sessionMetadata: input.sessionMetadata,
  })

  const specialistMatches = yield* specialistRegistry.filterByCapabilities(capabilityPlan.required, {
    maxSpecialists: 4,
  })

  const policy = yield* policyService.evaluate({
    classification,
    classifications,
    confidence: confidenceLevel,
    confidenceScore: confidenceScore.score,
    repositorySize: input.repositorySize,
    capabilities: capabilityPlan.required,
  })

  const specialistPlan = yield* dispatcher.planSpecialists({
    taskType: classification.type,
    specialists: specialistMatches,
    capabilities: capabilityPlan.required,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    maxSpecialists: policy.maxSpecialists,
  })

  const dispatchPlan = yield* dispatcher.planRich({
    taskType: classification.type,
    requiresContext: classification.requiresContext,
    requiresSearch: classification.requiresSearch,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    complexity: classification.complexity,
    classifications,
    confidenceScore: confidenceScore.score,
  })

  const knowledgePlan = yield* knowledgePlanner.plan({
    taskType: classification.type,
    requiredCapabilities: capabilityPlan.required,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    predictedSpecialists: specialistPlan.selected.map((m) => m.specialist.id),
  })

  const knowledgeTypes: string[] = []
  if (classification.requiresSearch) knowledgeTypes.push("search")
  if (classification.requiresContext) knowledgeTypes.push("context")
  if (classification.requiresDependencyGraph) knowledgeTypes.push("dependency")
  if (classification.requiresVerification) knowledgeTypes.push("verification")

  const planMetadata: KnowledgePlanMetadata = {
    planStartTime: Date.now(),
    planEndTime: undefined,
    knowledgeVersion: 1,
    source: "classify",
  }

  const knowledgeBundle = KnowledgeBundle.empty(classification.type)
  knowledgeBundle.planMetadata = planMetadata
  knowledgeBundle.knowledgeRequirements = capabilityProfile.requirements.map((r) => ({
    domain: r.capability,
    description: `Capability requirement: ${r.capability} (weight ${r.weight})`,
    required: !r.optional,
  }))
  knowledgeBundle.searchTargets = classification.requiresSearch
    ? [{ pattern: classification.type, description: "Search for relevant code", priority: 1, type: "code" }]
    : undefined
  knowledgeBundle.verificationTargets = classification.requiresVerification
    ? [{ target: classification.type, criteria: "Verify task requirements", priority: 1 }]
    : undefined
  knowledgeBundle.executionNotes = dispatchPlan.requiredAgents.length > 0
    ? [`Requires ${dispatchPlan.requiredAgents.join(", ")} agents`]
    : undefined

  return {
    needsOrchestration: dispatchPlan.requiredAgents.length > 0,
    taskClassification: classification,
    confidence: confidenceLevel,
    confidenceScore,
    dispatchPlan,
    knowledgeBundle,
    executionStatus: dispatchPlan.requiredAgents.length > 0 ? "collecting" : "completed",
    skipReason: dispatchPlan.requiredAgents.length === 0
      ? "no specialist agents required"
      : undefined,
    selectedCapabilities: requiredCapabilities,
    knowledgeRequirements: knowledgeTypes,
    executionNotes: dispatchPlan.requiredAgents.length > 0
      ? [`Requires ${dispatchPlan.requiredAgents.join(", ")} agents`]
      : undefined,
    specialistPlan: specialistMatches.length > 0 ? specialistPlan : undefined,
    capabilityPlan,
    knowledgePlan,
    executionGraph: undefined,
    planningPolicy: policy,
  }
})

const orchestrateWithContext: Interface["orchestrateWithContext"] = Effect.fn("OrchestratorService.orchestrateWithContext")(function* (input) {
  const classifier = yield* TaskClassifier.Service
  const confidence = yield* ConfidenceEngine.Service
  const dispatcher = yield* AgentDispatcher.Service
  const selector = yield* ModelSelector.Service
  const capabilityPlanner = yield* CapabilityPlanner.Service
  const specialistRegistry = yield* SpecialistRegistry.Service
  const knowledgePlanner = yield* KnowledgePlanner.Service
  const executionGraphBuilder = yield* ExecutionGraphBuilder.Service
  const policyService = yield* PlanningPolicyService.Service
  const memory = yield* PlanningMemory.Service
  let diagnosticsEntries: PhaseEntry[] = []
  const startTime = Date.now()

  yield* memory.initialize(input.sessionID)

  // Phase 1: Classification
  const t1 = Date.now()
  const classification = yield* classifier.classify({
    text: input.promptText,
    filesAttached: input.filesAttached,
    conversationLength: input.conversationLength,
  })
  const classificationTime = Date.now() - t1
  diagnosticsEntries = recordEntry(diagnosticsEntries, "classification", classificationTime, `type=${classification.type}`)

  const richSignals = [
    { signal: "prompt-text", text: input.promptText, weight: 1.0 },
    ...(input.sessionMetadata
      ? [{ signal: "session-metadata" as const, text: JSON.stringify(input.sessionMetadata), weight: 0.3 }]
      : []),
    ...(input.assistantResponses
      ? input.assistantResponses.map((r) => ({ signal: "previous-responses" as const, text: r, weight: 0.4 }))
      : []),
    ...(input.toolResults
      ? input.toolResults.map((r) => ({ signal: "tool-results" as const, text: r, weight: 0.5 }))
      : []),
    ...(input.projectInfo
      ? [{ signal: "project-info" as const, text: input.projectInfo, weight: 0.6 }]
      : []),
  ]

  const classifications = yield* classifier.classifyRich({
    signals: richSignals,
    sessionMetadata: input.sessionMetadata,
    assistantResponses: input.assistantResponses,
    toolResults: input.toolResults,
    projectInfo: input.projectInfo,
  })

  // Phase 2: Confidence estimation
  const t2 = Date.now()
  const confidenceLevel = yield* confidence.estimate({
    classification,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    filesAttached: input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: input.contextAvailable,
    previousToolResults: input.previousToolResults,
  })

  const confidenceScore = yield* confidence.estimateWithScore({
    classification,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    filesAttached: input.filesAttached ? 1 : 0,
    promptComplexity: classification.complexity,
    contextAvailable: input.contextAvailable,
    previousToolResults: input.previousToolResults,
    classifications,
    sessionMetadata: input.sessionMetadata,
    toolHistory: input.toolResults,
  })
  const confidenceTime = Date.now() - t2
  diagnosticsEntries = recordEntry(diagnosticsEntries, "confidence", confidenceTime, `level=${confidenceLevel}`)

  if (confidenceLevel === "high") {
    const totalTime = Date.now() - startTime
    diagnosticsEntries = recordEntry(diagnosticsEntries, "total", totalTime, "bypass-high-confidence")

    const timing: TimingInfo = {
      startTime,
      classificationEnd: startTime + classificationTime,
      confidenceEnd: startTime + classificationTime + confidenceTime,
      dispatchEnd: undefined,
      selectionEnd: undefined,
      planningEnd: undefined,
    }

    const decision: OrchestrationDecision = {
      needsOrchestration: false,
      taskClassification: classification,
      confidence: confidenceLevel,
      confidenceScore,
      dispatchPlan: AgentDispatcher.emptyDispatchPlan(),
      knowledgeBundle: KnowledgeBundle.empty(classification.type),
      executionStatus: "completed",
      skipReason: "high confidence — no specialist agents needed",
      selectedCapabilities: undefined,
      knowledgeRequirements: undefined,
      executionNotes: undefined,
      specialistPlan: undefined,
      capabilityPlan: undefined,
      knowledgePlan: undefined,
      executionGraph: undefined,
      planningPolicy: undefined,
    }

    const executionPackage = emptyPackage(input.sessionID)

    return { decision, timing, diagnostics: diagnosticsEntries, executionGraph: undefined, executionPackage }
  }

  // Phase 3: Capability planning
  const t3 = Date.now()
  const capabilityProfile = yield* selector.estimateCapabilities({
    taskType: classification.type,
    complexity: classification.complexity,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
  })
  const capabilityTime = Date.now() - t3
  diagnosticsEntries = recordEntry(diagnosticsEntries, "capability-resolution", capabilityTime, `capabilities=${capabilityProfile.recommendedCount}`)

  const requiredCapabilities = capabilityProfile.requirements
    .filter((r) => !r.optional)
    .map((r) => r.capability)

  const capabilityPlan = yield* capabilityPlanner.plan({
    taskClassification: classification,
    classifications,
    confidence: confidenceLevel,
    confidenceScore: confidenceScore.score,
    repositorySize: input.repositorySize,
    conversationLength: input.conversationLength,
    sessionMetadata: input.sessionMetadata,
  })
  yield* memory.updateCapabilityPlan(capabilityPlan)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "capability-planning", Date.now() - t3, `required=${capabilityPlan.required.length}`)

  // Phase 4: Specialist registry lookup
  const t4 = Date.now()
  const specialistMatches = yield* specialistRegistry.filterByCapabilities(capabilityPlan.required, {
    maxSpecialists: 4,
  })
  diagnosticsEntries = recordEntry(diagnosticsEntries, "specialist-lookup", Date.now() - t4, `matched=${specialistMatches.length}`)

  // Phase 5: Planning policy
  const policy = yield* policyService.evaluate({
    classification,
    classifications,
    confidence: confidenceLevel,
    confidenceScore: confidenceScore.score,
    repositorySize: input.repositorySize,
    capabilities: capabilityPlan.required,
  })
  yield* memory.updatePolicy(policy)

  const t5 = Date.now()
  const specialistPlan = yield* dispatcher.planSpecialists({
    taskType: classification.type,
    specialists: specialistMatches,
    capabilities: capabilityPlan.required,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    maxSpecialists: policy.maxSpecialists,
  })
  yield* memory.updateSpecialistPlan(specialistPlan)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "specialist-planning", Date.now() - t5, `specialists=${specialistPlan.selected.length}`)

  // Phase 6: Dispatch planning
  const t6 = Date.now()
  const dispatchPlan = yield* dispatcher.planRich({
    taskType: classification.type,
    requiresContext: classification.requiresContext,
    requiresSearch: classification.requiresSearch,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    complexity: classification.complexity,
    classifications,
    confidenceScore: confidenceScore.score,
  })
  const dispatchTime = Date.now() - t6
  diagnosticsEntries = recordEntry(diagnosticsEntries, "dispatch-planning", dispatchTime, `agents=${dispatchPlan.requiredAgents.length}`)

  // Phase 7: Knowledge planning
  const t7 = Date.now()
  const knowledgePlan = yield* knowledgePlanner.plan({
    taskType: classification.type,
    requiredCapabilities: capabilityPlan.required,
    requiresSearch: classification.requiresSearch,
    requiresContext: classification.requiresContext,
    requiresDependencyGraph: classification.requiresDependencyGraph,
    requiresVerification: classification.requiresVerification,
    predictedSpecialists: specialistPlan.selected.map((m) => m.specialist.id),
  })
  yield* memory.updateKnowledgePlan(knowledgePlan)
  const knowledgeTime = Date.now() - t7
  diagnosticsEntries = recordEntry(diagnosticsEntries, "knowledge-planning", knowledgeTime, `requests=${knowledgePlan.requests.length}`)

  // Phase 8: Execution graph
  const t8 = Date.now()
  const graphDeps = specialistPlan.dependencies.map((d) => ({ from: d.from, to: d.to }))
  const graph = yield* executionGraphBuilder.build({
    specialists: specialistPlan.selected.map((m) => m.specialist),
    capabilities: capabilityPlan.required,
    knowledgeRequests: knowledgePlan.requests.map((r) => ({ id: r.id, knowledgeType: r.knowledgeType })),
    specialistDependencies: graphDeps,
  })
  yield* memory.updateExecutionGraph(graph)
  const graphTime = Date.now() - t8
  diagnosticsEntries = recordEntry(diagnosticsEntries, "execution-graph", graphTime, `nodes=${graph.nodes.length}`)

  // Phase 9: Runtime-managed specialist execution
  const t9 = Date.now()
  const runtimeManager = yield* RuntimeManager.Service
  const runnerOutput = yield* runtimeManager.run({
    graph,
    policy,
    capabilityPlan,
    knowledgePlan,
    knowledgeBundle: KnowledgeBundle.empty(classification.type),
    taskObjective: input.promptText,
    taskType: classification.type,
    repositorySize: input.repositorySize,
    sessionID: input.sessionID,
  })
  const runtimeExecTime = Date.now() - t9
  diagnosticsEntries = recordEntry(diagnosticsEntries, "specialist-execution", runtimeExecTime, `completed=${runnerOutput.completed.length} failed=${runnerOutput.failed.length} cacheHits=${runnerOutput.metrics.cacheHitCount}`)

  // Phase 10: Knowledge collection + merge
  const t10 = Date.now()
  const collector = yield* KnowledgeCollector.Service
  const collected = yield* collector.collect(runnerOutput.results)

  const merger = yield* KnowledgeMerger.Service
  const knowledgeBundle = yield* merger.merge({
    base: KnowledgeBundle.empty(classification.type),
    collected,
    results: runnerOutput.results,
  })
  knowledgeBundle.planMetadata = {
    planStartTime: Date.now(),
    planEndTime: undefined,
    knowledgeVersion: 1,
    source: "specialist-execution" as const,
  }
  knowledgeBundle.knowledgeRequirements = capabilityProfile.requirements.map((r) => ({
    domain: r.capability,
    description: `Capability requirement: ${r.capability} (weight ${r.weight})`,
    required: !r.optional,
  }))
  knowledgeBundle.searchTargets = classification.requiresSearch
    ? [{ pattern: classification.type, description: "Search for relevant code", priority: 1, type: "code" as const }]
    : undefined
  knowledgeBundle.verificationTargets = classification.requiresVerification
    ? [{ target: classification.type, criteria: "Verify task requirements", priority: 1 }]
    : undefined
  knowledgeBundle.executionNotes = runnerOutput.failed.length > 0
    ? [`${runnerOutput.failed.length} specialist(s) failed during execution`]
    : dispatchPlan.requiredAgents.length > 0
      ? [`Requires ${dispatchPlan.requiredAgents.join(", ")} agents`]
      : undefined
  const mergeTime = Date.now() - t10
  diagnosticsEntries = recordEntry(diagnosticsEntries, "knowledge-merge", mergeTime, `entries=${collected.entries.length}`)

  // Phase 11: Intelligence analysis
  const t11 = Date.now()

  const validator = yield* KnowledgeValidator.Service
  const rankingEngine = yield* RankingEngine.Service
  const repoIntelligence = yield* RepositoryIntelligence.Service
  const contextIntelligence = yield* ContextIntelligence.Service
  const depIntelligence = yield* DependencyIntelligence.Service
  const docIntelligence = yield* DocumentationIntelligence.Service
  const archIntelligence = yield* ArchitectureIntelligence.Service
  const verIntelligence = yield* VerificationIntelligence.Service

  const validatedResults = yield* Effect.forEach(
    runnerOutput.results,
    (r) => validator.validate(r),
  )
  const totalInvalid = validatedResults.reduce((acc, v) => acc + v.invalidCount, 0)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "knowledge-validation", Date.now() - t11, `validated=${validatedResults.reduce((a, v) => a + v.entries.length, 0)} invalid=${totalInvalid}`)

  const allEntries = runnerOutput.results.flatMap((r) => r.collectedKnowledge)
  const ranked = yield* rankingEngine.rank(allEntries, input.promptText)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "knowledge-ranking", Date.now() - t11, `ranked=${ranked.length}`)

  const repoAnalysis = yield* repoIntelligence.analyze(knowledgeBundle)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "repository-intelligence", Date.now() - t11, `hotspots=${repoAnalysis.hotspots.length}`)

  const depAnalysis = yield* depIntelligence.analyze(knowledgeBundle)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "dependency-intelligence", Date.now() - t11, `chains=${depAnalysis.chains.length}`)

  const docAnalysis = yield* docIntelligence.analyze(knowledgeBundle)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "documentation-intelligence", Date.now() - t11, `docs=${docAnalysis.docs.length}`)

  const archAnalysis = yield* archIntelligence.analyze(knowledgeBundle)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "architecture-intelligence", Date.now() - t11, `subsystems=${archAnalysis.subsystems.length}`)

  const verAnalysis = yield* verIntelligence.analyze(knowledgeBundle)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "verification-intelligence", Date.now() - t11, `passed=${verAnalysis.mergedResults.filter((r) => r.passed).length}`)

  const ctxReport = yield* contextIntelligence.prepare(knowledgeBundle)
  diagnosticsEntries = recordEntry(diagnosticsEntries, "context-intelligence", Date.now() - t11, `quality=${(ctxReport.averageConfidence * 100).toFixed(0)}%`)

  const intelligenceTime = Date.now() - t11
  diagnosticsEntries = recordEntry(diagnosticsEntries, "intelligence-analysis", intelligenceTime, "intelligence-layer-complete")

  // Phase 12: Integration layer — build ExecutionPackage
  const t12 = Date.now()

  const pkgBuilder = yield* ExecutionPackageBuilder.Service
  const agentContext = yield* AgentContextService.Service
  const agentHintsService = yield* AgentHintsService.Service
  const agentCapsService = yield* AgentCapabilitiesService.Service
  const agentSelectionService = yield* AgentSelectionAdviceService.Service
  const promptAugmentationService = yield* PromptAugmentationService.Service
  const agentEnhancer = yield* AgentEnhancer.Service
  const agentAdapter = yield* AgentAdapter.Service

  const executionPackage = yield* pkgBuilder.build({
    sessionID: input.sessionID,
    taskClassification: classification,
    classifications,
    confidence: confidenceLevel,
    confidenceScore,
    capabilityPlan,
    specialistPlan,
    knowledgePlan,
    dispatchPlan,
    planningPolicy: policy,
    executionGraph: graph,
    knowledgeBundle,
    repositoryIntelligence: repoAnalysis,
    dependencyIntelligence: depAnalysis,
    architectureIntelligence: archAnalysis,
    documentationIntelligence: docAnalysis,
    verificationIntelligence: verAnalysis,
    contextIntelligence: ctxReport,
    runtimeMetrics: runnerOutput.metrics,
    executionNotes: runnerOutput.failed.length > 0 ? [`${runnerOutput.failed.length} specialist(s) failed`] : undefined,
  })

  const agentProfile = yield* agentContext.prepare(executionPackage)
  executionPackage.agentContextProfile = agentProfile

  const hints = yield* agentHintsService.generate(executionPackage, agentProfile.agentType)
  executionPackage.agentHints = hints

  const agentCaps = yield* agentCapsService.resolve(capabilityPlan?.required ?? [])
  const selectionAdvice = yield* agentSelectionService.advise(executionPackage)
  executionPackage.agentSelectionAdvice = selectionAdvice

  const promptAug = yield* promptAugmentationService.build(executionPackage)
  executionPackage.promptAugmentation = promptAug

  const enhanced = yield* agentEnhancer.enhance(executionPackage, agentProfile)

  const adapted = yield* agentAdapter.adapt(executionPackage)

  yield* memory.cacheExecutionPackage(executionPackage)

  const integrationTime = Date.now() - t12
  diagnosticsEntries = recordEntry(diagnosticsEntries, "integration-layer", integrationTime, `package-built agent=${agentProfile.agentType} hints=${hints.hints.length}`)

  const knowledgeTypes: string[] = []
  if (classification.requiresSearch) knowledgeTypes.push("search")
  if (classification.requiresContext) knowledgeTypes.push("context")
  if (classification.requiresDependencyGraph) knowledgeTypes.push("dependency")
  if (classification.requiresVerification) knowledgeTypes.push("verification")

  const totalTime = Date.now() - startTime
  diagnosticsEntries = recordEntry(diagnosticsEntries, "total", totalTime, "orchestration-complete")

  const timing: TimingInfo = {
    startTime,
    classificationEnd: startTime + classificationTime,
    confidenceEnd: startTime + classificationTime + confidenceTime,
    dispatchEnd: startTime + classificationTime + confidenceTime + capabilityTime + dispatchTime,
    selectionEnd: startTime + classificationTime + confidenceTime + capabilityTime,
    planningEnd: startTime + totalTime,
  }

  const decision: OrchestrationDecision = {
    needsOrchestration: dispatchPlan.requiredAgents.length > 0,
    taskClassification: classification,
    confidence: confidenceLevel,
    confidenceScore,
    dispatchPlan,
    knowledgeBundle,
    executionStatus: runnerOutput.completed.length > 0 && runnerOutput.failed.length === 0
      ? "completed"
      : runnerOutput.completed.length > 0 && runnerOutput.failed.length > 0
        ? "collecting"
        : "collecting",
    skipReason: dispatchPlan.requiredAgents.length === 0
      ? "no specialist agents required"
      : undefined,
    selectedCapabilities: requiredCapabilities,
    knowledgeRequirements: knowledgeTypes,
    executionNotes: runnerOutput.failed.length > 0
      ? [`${runnerOutput.failed.length} specialist(s) failed during execution`]
      : dispatchPlan.requiredAgents.length > 0
        ? [`Requires ${dispatchPlan.requiredAgents.join(", ")} agents`]
        : undefined,
    specialistPlan: specialistMatches.length > 0 ? specialistPlan : undefined,
    capabilityPlan,
    knowledgePlan,
    executionGraph: graph,
    planningPolicy: policy,
  }

  return { decision, timing, diagnostics: diagnosticsEntries, executionGraph: dispatchTime > 0 ? yield* dispatcher.buildExecutionGraph(dispatchPlan) : undefined, executionPackage }
})

const skip: Interface["skip"] = Effect.fn("OrchestratorService.skip")(function* (_input) {
  return {
    needsOrchestration: false,
    taskClassification: {
      type: "general-chat" as TaskType,
      complexity: 0,
      requiresContext: true,
      requiresSearch: false,
      requiresDependencyGraph: false,
      requiresVerification: false,
      confidence: "high" as ConfidenceLevel,
    },
    confidence: "high" as ConfidenceLevel,
    confidenceScore: undefined,
    dispatchPlan: AgentDispatcher.emptyDispatchPlan(),
    knowledgeBundle: KnowledgeBundle.empty("general-chat"),
    executionStatus: "completed",
    skipReason: "orchestration not requested",
    selectedCapabilities: undefined,
    knowledgeRequirements: undefined,
    executionNotes: undefined,
    specialistPlan: undefined,
    capabilityPlan: undefined,
    knowledgePlan: undefined,
    executionGraph: undefined,
    planningPolicy: undefined,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ orchestrate, orchestrateWithContext, skip })
  }),
).pipe(
  Layer.provide(SpecialistRegistry.layer),
  Layer.provide(CapabilityPlanner.layer),
  Layer.provide(KnowledgePlanner.layer),
  Layer.provide(ExecutionGraphBuilder.layer),
  Layer.provide(PlanningPolicyService.layer),
  Layer.provide(PlanningMemory.layer),
  Layer.provide(ModelAssignment.layer),
  Layer.provide(ContextBuilder.layer),
  Layer.provide(SpecialistExecutor.layer),
  Layer.provide(ExecutionScheduler.layer),
  Layer.provide(KnowledgeCollector.layer),
  Layer.provide(KnowledgeMerger.layer),
  Layer.provide(FailureRecovery.layer),
  Layer.provide(SpecialistRunner.layer),
  Layer.provide(RuntimeContext.layer),
  Layer.provide(RuntimeManager.layer),
  Layer.provide(PromptBuilder.layer),
  Layer.provide(RepositoryIntelligence.layer),
  Layer.provide(ContextIntelligence.layer),
  Layer.provide(DependencyIntelligence.layer),
  Layer.provide(DocumentationIntelligence.layer),
  Layer.provide(ArchitectureIntelligence.layer),
  Layer.provide(VerificationIntelligence.layer),
  Layer.provide(KnowledgeValidator.layer),
  Layer.provide(RankingEngine.layer),
  Layer.provide(ExecutionPackageBuilder.layer),
  Layer.provide(AgentContextService.layer),
  Layer.provide(AgentHintsService.layer),
  Layer.provide(AgentCapabilitiesService.layer),
  Layer.provide(AgentSelectionAdviceService.layer),
  Layer.provide(PromptAugmentationService.layer),
  Layer.provide(AgentEnhancer.layer),
  Layer.provide(AgentAdapter.layer),
)

export { layer }
