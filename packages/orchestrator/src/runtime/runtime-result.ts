export * as RuntimeResult from "./runtime-result"

import type { SpecialistResult, CollectedKnowledgeEntry, ModelCandidate } from "../execution/specialist-result"

export interface RuntimeResult {
  readonly specialistID: string
  readonly specialistName: string
  readonly assignedModel: ModelCandidate | undefined
  readonly provider: string | undefined
  readonly executionMetadata: {
    readonly startedAt: number
    readonly completedAt: number
    readonly durationMs: number
    readonly attempt: number
    readonly cacheHit: boolean
  }
  readonly confidence: number
  readonly collectedKnowledge: readonly RankedKnowledge[]
  readonly warnings: readonly string[]
  readonly failures: readonly string[]
  readonly verificationStatus: "verified" | "unverified" | "failed"
  readonly metadata: Record<string, string>
}

export interface RankedKnowledge {
  readonly type: string
  readonly content: string
  readonly source: string
  readonly confidence: number
  readonly timestamp: number
  readonly originatingProvider: string | undefined
  readonly modelIdentifier: string | undefined
  readonly verificationState: "pending" | "verified" | "conflicted"
  readonly supportingEvidence: readonly string[]
}

export function fromSpecialistResult(
  result: SpecialistResult,
  input: {
    readonly attempt: number
    readonly cacheHit: boolean
    readonly provider?: string
  },
): RuntimeResult {
  const ranked: RankedKnowledge[] = result.collectedKnowledge.map((entry: CollectedKnowledgeEntry) => ({
    type: entry.type,
    content: entry.content,
    source: entry.source,
    confidence: entry.confidence,
    timestamp: entry.timestamp,
    originatingProvider: result.modelCandidate?.providerID,
    modelIdentifier: result.modelCandidate?.modelID,
    verificationState: "pending" as const,
    supportingEvidence: [],
  }))

  const verified = ranked.filter((r) => r.confidence >= 0.5).length
  const verificationStatus: RuntimeResult["verificationStatus"] = ranked.length === 0
    ? "unverified"
    : verified === ranked.length
      ? "verified"
      : "failed"

  return {
    specialistID: result.specialistID,
    specialistName: result.specialistName,
    assignedModel: result.modelCandidate,
    provider: input.provider ?? result.modelCandidate?.providerID,
    executionMetadata: {
      startedAt: result.startTime,
      completedAt: result.endTime,
      durationMs: result.executionTime,
      attempt: input.attempt,
      cacheHit: input.cacheHit,
    },
    confidence: result.confidence,
    collectedKnowledge: ranked,
    warnings: result.warnings,
    failures: result.errors,
    verificationStatus,
    metadata: result.metadata,
  }
}
