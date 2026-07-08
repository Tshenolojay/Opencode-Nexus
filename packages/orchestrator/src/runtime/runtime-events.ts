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
] as const
