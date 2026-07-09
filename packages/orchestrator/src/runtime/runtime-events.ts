export * as RuntimeEvents from "./runtime-events"

import { Schema } from "effect"
import { Event } from "@opencode-ai/schema/event"

export const RuntimeStarted = Event.define({
  type: "orchestrator.runtime-started",
  schema: {
    sessionID: Schema.String,
    totalSpecialists: Schema.Finite,
    objective: Schema.String,
  },
})

export const RuntimeCompleted = Event.define({
  type: "orchestrator.runtime-completed",
  schema: {
    sessionID: Schema.String,
    completed: Schema.Finite,
    failed: Schema.Finite,
    totalDurationMs: Schema.Finite,
  },
})

export const RuntimeFailed = Event.define({
  type: "orchestrator.runtime-failed",
  schema: {
    sessionID: Schema.String,
    error: Schema.String,
    phase: Schema.String,
  },
})

export const RuntimeRecovered = Event.define({
  type: "orchestrator.runtime-recovered",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    attempts: Schema.Finite,
    recoveryStrategy: Schema.String,
  },
})

export const SpecialistAssigned = Event.define({
  type: "orchestrator.specialist-assigned",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    modelID: Schema.String.pipe(Schema.optional),
    providerID: Schema.String.pipe(Schema.optional),
  },
})

export const SpecialistExecuted = Event.define({
  type: "orchestrator.specialist-executed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    durationMs: Schema.Finite,
    confidence: Schema.Finite,
    knowledgeCount: Schema.Finite,
  },
})

export const CacheHit = Event.define({
  type: "orchestrator.cache-hit",
  schema: {
    sessionID: Schema.String,
    key: Schema.String,
  },
})

export const CacheMiss = Event.define({
  type: "orchestrator.cache-miss",
  schema: {
    sessionID: Schema.String,
    key: Schema.String,
  },
})

export const KnowledgeValidated = Event.define({
  type: "orchestrator.knowledge-validated",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    validCount: Schema.Finite,
    invalidCount: Schema.Finite,
    uncertainCount: Schema.Finite,
  },
})

export const KnowledgeRanked = Event.define({
  type: "orchestrator.knowledge-ranked",
  schema: {
    sessionID: Schema.String,
    totalFragments: Schema.Finite,
    topConfidence: Schema.Finite,
    averageRelevance: Schema.Finite,
  },
})

export const KnowledgeRejected = Event.define({
  type: "orchestrator.knowledge-rejected",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    reason: Schema.String,
    rejectedCount: Schema.Finite,
  },
})

export const KnowledgeCached = Event.define({
  type: "orchestrator.knowledge-cached",
  schema: {
    sessionID: Schema.String,
    key: Schema.String,
    ttlMs: Schema.Finite,
    source: Schema.String,
  },
})

export const KnowledgeReused = Event.define({
  type: "orchestrator.knowledge-reused",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    knowledgeType: Schema.String,
    sourceSpecialist: Schema.String,
  },
})

export const RepositoryAnalysed = Event.define({
  type: "orchestrator.repository-analysed",
  schema: {
    sessionID: Schema.String,
    hotspots: Schema.Finite,
    affectedAreas: Schema.Finite,
    riskLevel: Schema.String,
  },
})

export const ArchitectureAnalysed = Event.define({
  type: "orchestrator.architecture-analysed",
  schema: {
    sessionID: Schema.String,
    subsystems: Schema.Finite,
    integrationPoints: Schema.Finite,
    risks: Schema.Finite,
  },
})

export const DependencyAnalysed = Event.define({
  type: "orchestrator.dependency-analysed",
  schema: {
    sessionID: Schema.String,
    affectedPackages: Schema.Finite,
    blastRadius: Schema.Finite,
    chains: Schema.Finite,
  },
})

export const DocumentationAnalysed = Event.define({
  type: "orchestrator.documentation-analysed",
  schema: {
    sessionID: Schema.String,
    totalDocs: Schema.Finite,
    outdated: Schema.Finite,
    averageQuality: Schema.Finite,
  },
})

export const ExecutionPackageBuilt = Event.define({
  type: "orchestrator.execution-package-built",
  schema: {
    sessionID: Schema.String,
    packageSize: Schema.Finite,
    sections: Schema.Finite,
  },
})

export const AgentEnhanced = Event.define({
  type: "orchestrator.agent-enhanced",
  schema: {
    sessionID: Schema.String,
    agentType: Schema.String,
    suppressedSections: Schema.Finite,
    confidence: Schema.Finite,
  },
})

export const AgentAdviceGenerated = Event.define({
  type: "orchestrator.agent-advice-generated",
  schema: {
    sessionID: Schema.String,
    recommendedAgent: Schema.String,
    selectionConfidence: Schema.Finite,
    hints: Schema.Array(Schema.String),
  },
})

export const PromptAugmented = Event.define({
  type: "orchestrator.prompt-augmented",
  schema: {
    sessionID: Schema.String,
    augmentationSize: Schema.Finite,
    sections: Schema.Finite,
  },
})

export const ExecutionPackageReused = Event.define({
  type: "orchestrator.execution-package-reused",
  schema: {
    sessionID: Schema.String,
    previousSessionID: Schema.String,
    reuseCount: Schema.Finite,
  },
})

export const ReasoningBuilt = Event.define({
  type: "orchestrator.reasoning-built",
  schema: {
    sessionID: Schema.String,
    findingCount: Schema.Finite,
    buildTimeMs: Schema.Finite,
  },
})

export const ConsensusGenerated = Event.define({
  type: "orchestrator.consensus-generated",
  schema: {
    sessionID: Schema.String,
    overallConsensus: Schema.String,
    overallConfidence: Schema.Finite,
    agreementCount: Schema.Finite,
    disagreementCount: Schema.Finite,
  },
})

export const NarrativeGenerated = Event.define({
  type: "orchestrator.narrative-generated",
  schema: {
    sessionID: Schema.String,
    sectionCount: Schema.Finite,
    narrativeSize: Schema.Finite,
  },
})

export const DecisionGenerated = Event.define({
  type: "orchestrator.decision-generated",
  schema: {
    sessionID: Schema.String,
    decision: Schema.String,
    reason: Schema.String,
    confidence: Schema.Finite,
  },
})

export const ReasoningReused = Event.define({
  type: "orchestrator.reasoning-reused",
  schema: {
    sessionID: Schema.String,
    sourceSessionID: Schema.String,
    reuseCount: Schema.Finite,
  },
})

export const ReasoningCompressed = Event.define({
  type: "orchestrator.reasoning-compressed",
  schema: {
    sessionID: Schema.String,
    originalSize: Schema.Finite,
    compressedSize: Schema.Finite,
    savingsBytes: Schema.Finite,
  },
})

export const NarrativeUpdated = Event.define({
  type: "orchestrator.narrative-updated",
  schema: {
    sessionID: Schema.String,
    updateCount: Schema.Finite,
    reason: Schema.String,
  },
})

export const TeamCreated = Event.define({
  type: "orchestrator.team-created",
  schema: {
    sessionID: Schema.String,
    specialistCount: Schema.Finite,
    activeSpecialistIDs: Schema.Array(Schema.String),
  },
})

export const TasksDecomposed = Event.define({
  type: "orchestrator.tasks-decomposed",
  schema: {
    sessionID: Schema.String,
    taskCount: Schema.Finite,
    parallelGroupCount: Schema.Finite,
  },
})

export const WorkAllocated = Event.define({
  type: "orchestrator.work-allocated",
  schema: {
    sessionID: Schema.String,
    allocationCount: Schema.Finite,
    primarySpecialist: Schema.String,
  },
})

export const WorkspaceUpdated = Event.define({
  type: "orchestrator.workspace-updated",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    tasksCompleted: Schema.Finite,
    tasksPending: Schema.Finite,
  },
})

export const TeamDiscussionBuilt = Event.define({
  type: "orchestrator.team-discussion-built",
  schema: {
    sessionID: Schema.String,
    agreementCount: Schema.Finite,
    disagreementCount: Schema.Finite,
    unresolvedCount: Schema.Finite,
  },
})

export const ReviewCompleted = Event.define({
  type: "orchestrator.review-completed",
  schema: {
    sessionID: Schema.String,
    stage: Schema.String,
    passed: Schema.Boolean,
  },
})

export const CapabilityAdvertised = Event.define({
  type: "orchestrator.capability-advertised",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    capabilities: Schema.Array(Schema.String),
  },
})

export const CollaborationCompleted = Event.define({
  type: "orchestrator.collaboration-completed",
  schema: {
    sessionID: Schema.String,
    specialistCount: Schema.Finite,
    totalDurationMs: Schema.Finite,
  },
})

export const ExecutionSummaryPrepared = Event.define({
  type: "orchestrator.execution-summary-prepared",
  schema: {
    sessionID: Schema.String,
    taskType: Schema.String,
    complexity: Schema.Finite,
    confidence: Schema.String,
  },
})

export const ExecutionPackageProjected = Event.define({
  type: "orchestrator.execution-package-projected",
  schema: {
    sessionID: Schema.String,
    viewCount: Schema.Finite,
    projectionTimeMs: Schema.Finite,
  },
})

export const ConnectorPlanReused = Event.define({
  type: "orchestrator.connector-plan-reused",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
    reuseCount: Schema.Finite,
  },
})

export const ConnectorRegistered = Event.define({
  type: "orchestrator.connector-registered",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
  },
})

export const ConnectorRequested = Event.define({
  type: "orchestrator.connector-requested",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
    priority: Schema.Finite,
  },
})

export const ConnectorPrepared = Event.define({
  type: "orchestrator.connector-prepared",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
    durationMs: Schema.Finite,
    confidence: Schema.Finite,
  },
})

export const ConnectorCompleted = Event.define({
  type: "orchestrator.connector-completed",
  schema: {
    sessionID: Schema.String,
    sourceCount: Schema.Finite,
    totalDurationMs: Schema.Finite,
  },
})

export const KnowledgeSourceDiscovered = Event.define({
  type: "orchestrator.knowledge-source-discovered",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
    available: Schema.Boolean,
  },
})

export const ConnectorCacheHit = Event.define({
  type: "orchestrator.connector-cache-hit",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
  },
})

export const ConnectorCacheMiss = Event.define({
  type: "orchestrator.connector-cache-miss",
  schema: {
    sessionID: Schema.String,
    sourceType: Schema.String,
  },
})

export const PromptMetadataPrepared = Event.define({
  type: "orchestrator.prompt-metadata-prepared",
  schema: {
    sessionID: Schema.String,
    sectionCount: Schema.Finite,
    totalSize: Schema.Finite,
  },
})

export const ExecutionPackageDelivered = Event.define({
  type: "orchestrator.execution-package-delivered",
  schema: {
    sessionID: Schema.String,
    deliveryTimeMs: Schema.Finite,
    advisoryCount: Schema.Finite,
  },
})

export const ContextPrioritized = Event.define({
  type: "orchestrator.context-prioritized",
  schema: {
    sessionID: Schema.String,
    strategy: Schema.String,
    sectionCount: Schema.Finite,
    originalSize: Schema.Finite,
    compressedSize: Schema.Finite,
  },
})

export const WorkflowContextPrepared = Event.define({
  type: "orchestrator.workflow-context-prepared",
  schema: {
    sessionID: Schema.String,
    workflowType: Schema.String,
    stepCount: Schema.Finite,
  },
})

export const VerificationCompleted = Event.define({
  type: "orchestrator.verification-completed",
  schema: {
    sessionID: Schema.String,
    passed: Schema.Finite,
    failed: Schema.Finite,
    conflicts: Schema.Finite,
    overallConfidence: Schema.Finite,
  },
})

export const SpecialistSessionCreated = Event.define({
  type: "orchestrator.specialist-session-created",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    priority: Schema.Finite,
  },
})

export const SpecialistSessionCompleted = Event.define({
  type: "orchestrator.specialist-session-completed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    durationMs: Schema.Finite,
    attempts: Schema.Finite,
    success: Schema.Boolean,
  },
})

export const KnowledgeShared = Event.define({
  type: "orchestrator.knowledge-shared",
  schema: {
    sessionID: Schema.String,
    from: Schema.String,
    knowledgeType: Schema.String,
    confidence: Schema.Finite,
  },
})

export const KnowledgeTransferred = Event.define({
  type: "orchestrator.knowledge-transferred",
  schema: {
    sessionID: Schema.String,
    from: Schema.String,
    to: Schema.String,
    knowledgeType: Schema.String,
  },
})

export const ConsensusStarted = Event.define({
  type: "orchestrator.consensus-started",
  schema: {
    sessionID: Schema.String,
    participantCount: Schema.Finite,
    topics: Schema.Array(Schema.String),
  },
})

export const ConsensusCompleted = Event.define({
  type: "orchestrator.consensus-completed",
  schema: {
    sessionID: Schema.String,
    level: Schema.String,
    agreementRatio: Schema.Finite,
    voteCount: Schema.Finite,
  },
})

export const ExecutionRetried = Event.define({
  type: "orchestrator.execution-retried",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    attempt: Schema.Finite,
    reason: Schema.String,
    fallbackModel: Schema.String.pipe(Schema.optional),
    fallbackProvider: Schema.String.pipe(Schema.optional),
  },
})

export const ExecutionRecovered = Event.define({
  type: "orchestrator.execution-recovered",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    attempts: Schema.Finite,
    recoveryStrategy: Schema.String,
  },
})

export const ExecutionCancelled = Event.define({
  type: "orchestrator.execution-cancelled",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    reason: Schema.String,
    budgetExceeded: Schema.Boolean,
  },
})

export const CloudExecutionPrepared = Event.define({
  type: "orchestrator.cloud-execution-prepared",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    providerID: Schema.String,
    modelID: Schema.String,
    estimatedTokens: Schema.Finite,
  },
})

export const CloudExecutionCompleted = Event.define({
  type: "orchestrator.cloud-execution-completed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    providerID: Schema.String,
    modelID: Schema.String,
    durationMs: Schema.Finite,
    tokensIn: Schema.Finite,
    tokensOut: Schema.Finite,
    cost: Schema.Finite,
  },
})

export const BudgetExceeded = Event.define({
  type: "orchestrator.budget-exceeded",
  schema: {
    sessionID: Schema.String,
    dimension: Schema.String,
    limit: Schema.Finite,
    consumed: Schema.Finite,
  },
})

export const ExecutionAdapted = Event.define({
  type: "orchestrator.execution-adapted",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    adaptation: Schema.String,
    reason: Schema.String,
  },
})

export const Definitions = [
  RuntimeStarted,
  RuntimeCompleted,
  RuntimeFailed,
  RuntimeRecovered,
  SpecialistAssigned,
  SpecialistExecuted,
  CacheHit,
  CacheMiss,
  KnowledgeValidated,
  KnowledgeRanked,
  KnowledgeRejected,
  KnowledgeCached,
  KnowledgeReused,
  RepositoryAnalysed,
  ArchitectureAnalysed,
  DependencyAnalysed,
  DocumentationAnalysed,
  VerificationCompleted,
  ExecutionPackageBuilt,
  AgentEnhanced,
  AgentAdviceGenerated,
  PromptAugmented,
  ExecutionPackageReused,
  ReasoningBuilt,
  ConsensusGenerated,
  NarrativeGenerated,
  DecisionGenerated,
  ReasoningReused,
  ReasoningCompressed,
  NarrativeUpdated,
  ExecutionSummaryPrepared,
  ExecutionPackageProjected,
  ConnectorPlanReused,
  ConnectorRegistered,
  ConnectorRequested,
  ConnectorPrepared,
  ConnectorCompleted,
  KnowledgeSourceDiscovered,
  ConnectorCacheHit,
  ConnectorCacheMiss,
  PromptMetadataPrepared,
  ExecutionPackageDelivered,
  ContextPrioritized,
  WorkflowContextPrepared,
  SpecialistSessionCreated,
  SpecialistSessionCompleted,
  KnowledgeShared,
  KnowledgeTransferred,
  TeamCreated,
  TasksDecomposed,
  WorkAllocated,
  WorkspaceUpdated,
  TeamDiscussionBuilt,
  ReviewCompleted,
  CapabilityAdvertised,
  CollaborationCompleted,
  ConsensusStarted,
  ConsensusCompleted,
  ExecutionRetried,
  ExecutionRecovered,
  ExecutionCancelled,
  CloudExecutionPrepared,
  CloudExecutionCompleted,
  BudgetExceeded,
  ExecutionAdapted,
] as const
