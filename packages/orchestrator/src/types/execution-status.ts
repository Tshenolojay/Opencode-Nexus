import { Schema } from "effect"

export const ExecutionStatus = Schema.Literals([
  "idle",
  "classifying",
  "confidence-checking",
  "dispatching",
  "selecting-models",
  "collecting",
  "augmenting",
  "completed",
  "failed",
])
export type ExecutionStatus = typeof ExecutionStatus.Type
