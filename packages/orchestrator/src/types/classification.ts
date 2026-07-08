import { Schema } from "effect"

export const TaskType = Schema.Literals([
  "code-generation",
  "bug-fix",
  "debugging",
  "repository-search",
  "dependency-investigation",
  "architecture-design",
  "documentation",
  "testing",
  "refactoring",
  "performance-optimisation",
  "security-review",
  "general-chat",
])
export type TaskType = typeof TaskType.Type

export const TaskSignal = Schema.Literals([
  "prompt-text",
  "session-metadata",
  "attached-files",
  "conversation-history",
  "previous-responses",
  "tool-results",
  "project-info",
])
export type TaskSignal = typeof TaskSignal.Type

export const SignalConfidence = Schema.Struct({
  signal: TaskSignal,
  weight: Schema.Finite,
})
export type SignalConfidence = typeof SignalConfidence.Type

export interface ClassificationResult {
  readonly type: TaskType
  readonly confidence: number
  readonly signals: readonly SignalConfidence[]
  readonly complexity: number
  readonly requiresContext: boolean
  readonly requiresSearch: boolean
  readonly requiresDependencyGraph: boolean
  readonly requiresVerification: boolean
}
