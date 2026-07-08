export * as KnowledgeValidator from "./knowledge-validator"

import { Context, Effect, Layer } from "effect"
import type { SpecialistResult, CollectedKnowledgeEntry } from "../execution/specialist-result"

export type ValidationStatus = "valid" | "invalid" | "uncertain"

export interface ValidatedKnowledge {
  readonly specialistID: string
  readonly sourceEntry: CollectedKnowledgeEntry
  readonly status: ValidationStatus
  readonly confidence: number
  readonly issues: readonly string[]
  readonly evidence: readonly string[]
}

export interface ValidationResult {
  readonly entries: readonly ValidatedKnowledge[]
  readonly validCount: number
  readonly invalidCount: number
  readonly uncertainCount: number
  readonly rejectedEntries: readonly CollectedKnowledgeEntry[]
}

export interface Interface {
  readonly validate: (result: SpecialistResult) => Effect.Effect<ValidationResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgeValidator") {}

const validate: Interface["validate"] = Effect.fn("KnowledgeValidator.validate")(function* (result) {
  const validated: ValidatedKnowledge[] = []
  const rejected: CollectedKnowledgeEntry[] = []

  for (const entry of result.collectedKnowledge) {
    const issues: string[] = []
    const evidence: string[] = []

    if (entry.confidence < 0 || entry.confidence > 1) {
      issues.push(`confidence out of range: ${entry.confidence}`)
    }

    if (entry.confidence < 0.2) {
      issues.push(`confidence too low: ${entry.confidence}`)
    }

    if (entry.content.length === 0) {
      issues.push("empty content")
    }

    if (entry.content.length > 10000) {
      issues.push(`content exceeds recommended length: ${entry.content.length} chars`)
    }

    if (entry.source.length === 0) {
      issues.push("missing source attribution")
    }

    if (entry.content.includes("undefined") || entry.content.includes("null")) {
      evidence.push("content contains placeholder values")
    }

    const hasEvidence = evidence.length > 0
    const hasBlockingIssues = issues.some((i) =>
      i.startsWith("confidence out of range") || i === "empty content" || i.startsWith("confidence too low"),
    )

    let status: ValidationStatus
    if (hasBlockingIssues) {
      status = "invalid"
      rejected.push(entry)
    } else if (issues.length > 0 || hasEvidence) {
      status = "uncertain"
    } else {
      status = "valid"
    }

    validated.push({
      specialistID: result.specialistID,
      sourceEntry: entry,
      status,
      confidence: entry.confidence,
      issues,
      evidence,
    })
  }

  const validCount = validated.filter((v) => v.status === "valid").length
  const invalidCount = validated.filter((v) => v.status === "invalid").length
  const uncertainCount = validated.filter((v) => v.status === "uncertain").length

  return { entries: validated, validCount, invalidCount, uncertainCount, rejectedEntries: rejected }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ validate })
  }),
)

export { layer }
