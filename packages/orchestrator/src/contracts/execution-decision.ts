export * as ExecutionDecision from "./execution-decision"

import type { OrchestrationDecision } from "./service"
import type { ConfidenceScore } from "../types/confidence"
import type { Capability } from "../types/capability"
import type { DispatchPlan } from "../dispatcher/dispatcher"
import type { TimingInfo } from "../types/metadata"
import type { TaskType } from "../types/classification"
import type { ConfidenceLevel } from "../types/confidence"
import type { AgentRole } from "../types/dispatch"

export interface DiagnosticsSummary {
  readonly taskType: TaskType | undefined
  readonly confidence: ConfidenceLevel | undefined
  readonly confidenceScore: number | undefined
  readonly capabilities: readonly Capability[]
  readonly requiredAgents: readonly AgentRole[]
  readonly estimatedSpecialists: number
  readonly requiresFurtherPlanning: boolean
  readonly totalPlanningTimeMs: number
  readonly phasesCompleted: readonly string[]
}

/**
 * Runtime execution decision produced by SessionIntegration.
 *
 * This is the contract between the orchestration layer and the
 * existing execution engine. When continueNormally is true the
 * SessionRunner executes exactly as today — the orchestrator is
 * transparent.
 */
export interface ExecutionDecision {
  readonly needsOrchestration: boolean
  readonly continueNormally: boolean
  readonly decision: OrchestrationDecision
  readonly confidenceScore: ConfidenceScore | undefined
  readonly selectedCapabilities: readonly Capability[] | undefined
  readonly dispatchPlan: DispatchPlan
  readonly knowledgeRequirements: readonly string[] | undefined
  readonly executionNotes: readonly string[] | undefined
  readonly diagnostics: DiagnosticsSummary | undefined
  readonly timing: TimingInfo | undefined
}
