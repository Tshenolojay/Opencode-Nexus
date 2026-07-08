import { Schema } from "effect"

export const ConfidenceLevel = Schema.Literals(["high", "medium", "low"])
export type ConfidenceLevel = typeof ConfidenceLevel.Type

export interface ConfidenceFactor {
  readonly name: string
  readonly value: number
  readonly weight: number
  readonly description: string
}

export interface ConfidenceScore {
  readonly score: number
  readonly level: ConfidenceLevel
  readonly factors: readonly ConfidenceFactor[]
  readonly factorCount: number
}
