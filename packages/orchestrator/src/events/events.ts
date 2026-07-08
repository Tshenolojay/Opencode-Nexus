export * as OrchestratorEvents from "./events"
export * as RuntimeEvents from "../runtime/runtime-events"

import { Schema } from "effect"
import { Event } from "@opencode-ai/schema/event"
import { TaskClassification } from "../classifier/schema"
import { ConfidenceLevel } from "../types/confidence"
import { ExecutionStatus } from "../types/execution-status"

export const TaskClassified = Event.define({
  type: "orchestrator.task-classified",
  schema: {
    sessionID: Schema.String,
    taskClassification: TaskClassification,
  },
})

export const ConfidenceCalculated = Event.define({
  type: "orchestrator.confidence-calculated",
  schema: {
    sessionID: Schema.String,
    confidence: ConfidenceLevel,
    score: Schema.Finite,
  },
})

export const ModelSelected = Event.define({
  type: "orchestrator.model-selected",
  schema: {
    sessionID: Schema.String,
    providerID: Schema.String,
    modelID: Schema.String,
    capabilities: Schema.Array(Schema.String),
    matchScore: Schema.Finite.pipe(Schema.optional),
  },
})

export const KnowledgePrepared = Event.define({
  type: "orchestrator.knowledge-prepared",
  schema: {
    sessionID: Schema.String,
    knowledgeTargets: Schema.Array(Schema.String),
    planMetadata: Schema.Struct({
      knowledgeVersion: Schema.Finite,
      source: Schema.String,
    }),
  },
})

export const DispatchPlanned = Event.define({
  type: "orchestrator.dispatch-planned",
  schema: {
    sessionID: Schema.String,
    dispatchPlan: Schema.Struct({
      requiredAgents: Schema.Array(Schema.String),
      executionOrder: Schema.Array(Schema.Array(Schema.String)),
      knowledgeTargets: Schema.Array(Schema.String),
    }),
  },
})

export const KnowledgeRequested = Event.define({
  type: "orchestrator.knowledge-requested",
  schema: {
    sessionID: Schema.String,
    agentID: Schema.String,
    targets: Schema.Array(Schema.String),
  },
})

export const KnowledgeReady = Event.define({
  type: "orchestrator.knowledge-ready",
  schema: {
    sessionID: Schema.String,
    agentID: Schema.String,
    bundle: Schema.Struct({
      taskType: Schema.String,
      repositorySummary: Schema.String.pipe(Schema.optional),
      relevantFiles: Schema.Array(Schema.String),
      contextSummary: Schema.String.pipe(Schema.optional),
    }),
  },
})

export const OrchestrationFinished = Event.define({
  type: "orchestrator.orchestration-finished",
  schema: {
    sessionID: Schema.String,
    needsOrchestration: Schema.Boolean,
    confidence: ConfidenceLevel,
    status: ExecutionStatus,
  },
})

export const OrchestrationCompleted = Event.define({
  type: "orchestrator.orchestration-completed",
  schema: {
    sessionID: Schema.String,
    confidence: ConfidenceLevel,
    status: ExecutionStatus,
    needsOrchestration: Schema.Boolean,
    totalDurationMs: Schema.Finite,
    selectedCapabilities: Schema.Array(Schema.String),
  },
})

export const SpecialistStarted = Event.define({
  type: "orchestrator.specialist-started",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    specialistName: Schema.String,
  },
})

export const SpecialistCompleted = Event.define({
  type: "orchestrator.specialist-completed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    confidence: Schema.Finite,
    executionTimeMs: Schema.Finite,
  },
})

export const SpecialistFailed = Event.define({
  type: "orchestrator.specialist-failed",
  schema: {
    sessionID: Schema.String,
    specialistID: Schema.String,
    error: Schema.String,
  },
})

export const KnowledgeMerged = Event.define({
  type: "orchestrator.knowledge-merged",
  schema: {
    sessionID: Schema.String,
    totalEntries: Schema.Finite,
    totalConfidence: Schema.Finite,
  },
})

export const ExecutionScheduled = Event.define({
  type: "orchestrator.execution-scheduled",
  schema: {
    sessionID: Schema.String,
    batches: Schema.Finite,
    estimatedDurationMs: Schema.Finite,
  },
})

export const ExecutionCompleted = Event.define({
  type: "orchestrator.execution-completed",
  schema: {
    sessionID: Schema.String,
    completed: Schema.Finite,
    failed: Schema.Finite,
    partial: Schema.Boolean,
  },
})

import {
  RuntimeStarted,
  RuntimeCompleted,
  RuntimeFailed,
  RuntimeRecovered,
  SpecialistAssigned,
  SpecialistExecuted as RuntimeSpecialistExecuted,
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
} from "../runtime/runtime-events"

export const Definitions = [
  TaskClassified,
  ConfidenceCalculated,
  ModelSelected,
  KnowledgePrepared,
  DispatchPlanned,
  KnowledgeRequested,
  KnowledgeReady,
  OrchestrationFinished,
  OrchestrationCompleted,
  SpecialistStarted,
  SpecialistCompleted,
  SpecialistFailed,
  KnowledgeMerged,
  ExecutionScheduled,
  ExecutionCompleted,
  RuntimeStarted,
  RuntimeCompleted,
  RuntimeFailed,
  RuntimeRecovered,
  SpecialistAssigned,
  RuntimeSpecialistExecuted,
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
] as const
