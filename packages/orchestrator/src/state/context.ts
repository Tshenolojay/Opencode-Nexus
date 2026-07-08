export * as OrchestrationContext from "./context"

import { Context, Effect } from "effect"
import type { TaskClassification, ClassificationResult } from "../classifier/schema"
import type { ConfidenceLevel, ConfidenceScore } from "../types/confidence"
import type { Capability } from "../types/capability"
import type { DispatchPlan } from "../dispatcher/dispatcher"
import type { TimingInfo } from "../types/metadata"

export interface PrimaryModelRef {
  readonly providerID: string | undefined
  readonly modelID: string | undefined
  readonly agentID: string | undefined
}

export interface OrchestrationContext {
  readonly sessionID: string
  readonly projectInfo: string | undefined
  readonly primaryModel: PrimaryModelRef
  readonly taskClassification: TaskClassification | undefined
  readonly classifications: readonly ClassificationResult[] | undefined
  readonly confidenceLevel: ConfidenceLevel | undefined
  readonly confidenceScore: ConfidenceScore | undefined
  readonly dispatchPlan: DispatchPlan | undefined
  readonly selectedCapabilities: readonly Capability[] | undefined
  readonly knowledgeRequirements: readonly string[] | undefined
  readonly timing: TimingInfo | undefined
  readonly diagnostics: Record<string, unknown> | undefined
}

export function empty(sessionID: string): OrchestrationContext {
  return {
    sessionID,
    projectInfo: undefined,
    primaryModel: { providerID: undefined, modelID: undefined, agentID: undefined },
    taskClassification: undefined,
    classifications: undefined,
    confidenceLevel: undefined,
    confidenceScore: undefined,
    dispatchPlan: undefined,
    selectedCapabilities: undefined,
    knowledgeRequirements: undefined,
    timing: undefined,
    diagnostics: undefined,
  }
}

export class Service extends Context.Service<Service, OrchestrationContext>()("@opencode/orchestrator/OrchestrationContext") {}

export const layer = (sessionID: string) =>
  Context.make(Service, empty(sessionID))
