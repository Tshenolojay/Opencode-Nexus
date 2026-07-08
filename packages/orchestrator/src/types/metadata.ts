import { Schema } from "effect"

export const ExecutionPhase = Schema.Literals([
  "bypass",
  "classify",
  "plan",
  "collect",
  "augment",
  "execute",
])
export type ExecutionPhase = typeof ExecutionPhase.Type

export interface TimingInfo {
  readonly startTime: number
  readonly classificationEnd: number | undefined
  readonly confidenceEnd: number | undefined
  readonly dispatchEnd: number | undefined
  readonly selectionEnd: number | undefined
  readonly planningEnd: number | undefined
}

export interface OrchestrationMetadata {
  readonly version: number
  readonly phase: ExecutionPhase
  readonly timing: TimingInfo
  readonly errorCount: number
  readonly warning: string | undefined
}
