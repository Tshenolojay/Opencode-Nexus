export * as ClassifierSchema from "./schema"

import { Schema } from "effect"
import { TaskType, TaskSignal } from "../types/classification"
import { ConfidenceLevel } from "../types/confidence"

export interface TaskClassification extends Schema.Schema.Type<typeof TaskClassification> {}
export const TaskClassification = Schema.Struct({
  type: TaskType,
  complexity: Schema.Finite,
  requiresContext: Schema.Boolean,
  requiresSearch: Schema.Boolean,
  requiresDependencyGraph: Schema.Boolean,
  requiresVerification: Schema.Boolean,
  confidence: ConfidenceLevel,
}).annotate({ identifier: "Orchestrator.TaskClassification" })

export const ClassificationSignalInput = Schema.Struct({
  signal: TaskSignal,
  text: Schema.String,
  weight: Schema.Finite,
}).annotate({ identifier: "Orchestrator.ClassificationSignalInput" })

export const ClassifierInput = Schema.Struct({
  text: Schema.String,
  filesAttached: Schema.Boolean,
  conversationLength: Schema.Finite,
}).annotate({ identifier: "Orchestrator.ClassifierInput" })
export type ClassifierInput = typeof ClassifierInput.Type

export interface ClassifierInputRich {
  readonly signals: readonly ClassifierSignal[]
  readonly sessionMetadata: Record<string, string> | undefined
  readonly assistantResponses: readonly string[] | undefined
  readonly toolResults: readonly string[] | undefined
  readonly projectInfo: string | undefined
}

export interface ClassifierSignal {
  readonly signal: string
  readonly text: string
  readonly weight: number
}

export interface ClassificationResult {
  readonly type: string
  readonly confidence: number
  readonly signals: readonly {
    readonly signal: string
    readonly weight: number
  }[]
  readonly complexity: number
  readonly requiresContext: boolean
  readonly requiresSearch: boolean
  readonly requiresDependencyGraph: boolean
  readonly requiresVerification: boolean
}
