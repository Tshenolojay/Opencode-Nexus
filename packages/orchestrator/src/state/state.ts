export * as OrchestrationState from "./state"

import type { TaskClassification, ClassificationResult } from "../classifier/schema"
import type { ConfidenceLevel, ConfidenceScore } from "../types/confidence"
import type { Capability } from "../types/capability"
import type { ExecutionStatus } from "../types/execution-status"
import type { ExecutionPhase, OrchestrationMetadata, TimingInfo } from "../types/metadata"
import type { DispatchPlan, SpecialistPlan } from "../dispatcher/dispatcher"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { Graph } from "../planner/execution-graph"
import type { PlanningPolicy } from "../planner/planning-policy"

export interface OrchestrationState {
  readonly sessionID: string
  readonly taskClassification: TaskClassification | undefined
  readonly classifications: readonly ClassificationResult[] | undefined
  readonly confidence: ConfidenceLevel | undefined
  readonly confidenceScore: ConfidenceScore | undefined
  readonly dispatchPlan: DispatchPlan | undefined
  readonly knowledgeBundle: KnowledgeBundle | undefined
  readonly executionStatus: ExecutionStatus
  readonly error: string | undefined
  readonly selectedCapabilities: readonly Capability[] | undefined
  readonly timing: TimingInfo | undefined
  readonly metadata: OrchestrationMetadata | undefined
  readonly executionPhase: ExecutionPhase | undefined
  readonly specialistPlan: SpecialistPlan | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly executionGraph: Graph | undefined
  readonly planningPolicy: PlanningPolicy | undefined
  readonly knowledgeStatus: "idle" | "collecting" | "completed" | "failed"
}

export function initial(sessionID: string): OrchestrationState {
  const now = Date.now()
  return {
    sessionID,
    taskClassification: undefined,
    classifications: undefined,
    confidence: undefined,
    confidenceScore: undefined,
    dispatchPlan: undefined,
    knowledgeBundle: undefined,
    executionStatus: "idle",
    error: undefined,
    selectedCapabilities: undefined,
    timing: undefined,
    metadata: undefined,
    executionPhase: undefined,
    specialistPlan: undefined,
    capabilityPlan: undefined,
    knowledgePlan: undefined,
    executionGraph: undefined,
    planningPolicy: undefined,
    knowledgeStatus: "idle",
  }
}
