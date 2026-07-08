export * as ExecutionPackage from "./execution-package"

import type { TaskClassification, ClassificationResult } from "../classifier/schema"
import type { ConfidenceLevel, ConfidenceScore } from "../types/confidence"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { DispatchPlan, SpecialistPlan } from "../dispatcher/dispatcher"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { PlanningPolicy } from "../planner/planning-policy"
import type { ExecutionGraph } from "../planner/execution-graph"
import type { Metrics } from "../runtime/runtime-metrics"
import type { RepositoryAnalysis } from "../intelligence/repository-intelligence"
import type { DependencyAnalysis } from "../intelligence/dependency-intelligence"
import type { ArchitectureAnalysis } from "../intelligence/architecture-intelligence"
import type { DocumentationAnalysis } from "../intelligence/documentation-intelligence"
import type { VerificationAnalysis } from "../intelligence/verification-intelligence"
import type { ContextQualityReport } from "../intelligence/context-intelligence"
import type { AgentHints } from "./agent-hints"
import type { AgentSelectionAdvice } from "./agent-selection-advice"
import type { PromptAugmentation } from "./prompt-augmentation"
import type { AgentContextProfile } from "./agent-context"

export interface ExecutionPackage {
  readonly sessionID: string
  readonly timestamp: number

  readonly taskClassification: TaskClassification
  readonly classifications: readonly ClassificationResult[]
  readonly confidence: ConfidenceLevel
  readonly confidenceScore: ConfidenceScore | undefined

  readonly capabilityPlan: CapabilityPlan | undefined
  readonly specialistPlan: SpecialistPlan | undefined
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly dispatchPlan: DispatchPlan | undefined
  readonly planningPolicy: PlanningPolicy | undefined
  readonly executionGraph: ExecutionGraph | undefined

  readonly knowledgeBundle: KnowledgeBundle

  readonly repositoryIntelligence: RepositoryAnalysis | undefined
  readonly dependencyIntelligence: DependencyAnalysis | undefined
  readonly architectureIntelligence: ArchitectureAnalysis | undefined
  readonly documentationIntelligence: DocumentationAnalysis | undefined
  readonly verificationIntelligence: VerificationAnalysis | undefined
  readonly contextIntelligence: ContextQualityReport | undefined

  readonly conversationSummary: string | undefined
  readonly modelRecommendation: string | undefined

  readonly runtimeMetrics: Metrics | undefined
  readonly executionNotes: readonly string[] | undefined

  readonly agentSelectionAdvice: AgentSelectionAdvice | undefined
  readonly agentContextProfile: AgentContextProfile | undefined
  readonly agentHints: AgentHints | undefined

  readonly promptAugmentation: PromptAugmentation | undefined
}

export function empty(sessionID: string): ExecutionPackage {
  return {
    sessionID,
    timestamp: Date.now(),
    taskClassification: { type: "general-chat", complexity: 0, requiresContext: true, requiresSearch: false, requiresDependencyGraph: false, requiresVerification: false, confidence: "high" },
    classifications: [],
    confidence: "high",
    confidenceScore: undefined,
    capabilityPlan: undefined,
    specialistPlan: undefined,
    knowledgePlan: undefined,
    dispatchPlan: undefined,
    planningPolicy: undefined,
    executionGraph: undefined,
    knowledgeBundle: {
      taskType: "general-chat",
      repositorySummary: undefined,
      relevantFiles: [],
      relevantSymbols: [],
      searchResults: [],
      dependencyGraph: [],
      architectureNotes: undefined,
      architectureSummary: undefined,
      externalReferences: [],
      verificationResults: [],
      contextSummary: undefined,
      planMetadata: undefined,
      knowledgeRequirements: undefined,
      searchTargets: undefined,
      verificationTargets: undefined,
      executionNotes: undefined,
      documentation: undefined,
      configuration: undefined,
      projectStructure: undefined,
      conversationSummary: undefined,
      toolHistory: undefined,
      verificationNotes: undefined,
      searchResultsExternal: undefined,
      externalKnowledge: undefined,
      dependencies: undefined,
      knowledgeMeta: undefined,
    },
    repositoryIntelligence: undefined,
    dependencyIntelligence: undefined,
    architectureIntelligence: undefined,
    documentationIntelligence: undefined,
    verificationIntelligence: undefined,
    contextIntelligence: undefined,
    conversationSummary: undefined,
    modelRecommendation: undefined,
    runtimeMetrics: undefined,
    executionNotes: undefined,
    agentSelectionAdvice: undefined,
    agentContextProfile: undefined,
    agentHints: undefined,
    promptAugmentation: undefined,
  }
}
