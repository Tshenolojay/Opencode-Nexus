export * as RuntimeValidator from "./runtime-validator"

import { Context, Effect, Layer } from "effect"
import type { RuntimeResult } from "./runtime-result"

export interface ValidationIssue {
  readonly field: string
  readonly severity: "warning" | "error"
  readonly message: string
}

export interface ValidationReport {
  readonly valid: boolean
  readonly confidenceScore: number
  readonly issues: readonly ValidationIssue[]
  readonly missingSections: readonly string[]
  readonly qualityScore: number
}

export interface Interface {
  readonly validate: (result: RuntimeResult, requiredSections: readonly string[]) => Effect.Effect<ValidationReport>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RuntimeValidator") {}

const validate: Interface["validate"] = Effect.fn("RuntimeValidator.validate")(function* (result, requiredSections) {
  const issues: ValidationIssue[] = []

  if (result.confidence < 0 || result.confidence > 1) {
    issues.push({ field: "confidence", severity: "error", message: "confidence out of range [0,1]" })
  }

  const presentTypes = result.collectedKnowledge.map((k) => k.type)
  const missing = requiredSections.filter((s) => !presentTypes.includes(s))
  for (const m of missing) {
    issues.push({ field: m, severity: "warning", message: `missing required knowledge section: ${m}` })
  }

  if (result.verificationStatus === "failed") {
    issues.push({ field: "verification", severity: "warning", message: "verification status is failed" })
  }

  for (const k of result.collectedKnowledge) {
    if (k.confidence < 0 || k.confidence > 1) {
      issues.push({ field: k.type, severity: "error", message: `knowledge confidence out of range for ${k.type}` })
    }
  }

  const confidenceScore = result.confidence
  const qualityScore = presentTypes.length > 0
    ? result.collectedKnowledge.reduce((acc, k) => acc + k.confidence, 0) / result.collectedKnowledge.length
    : 0

  const valid = issues.every((i) => i.severity !== "error")

  return {
    valid,
    confidenceScore,
    issues,
    missingSections: missing,
    qualityScore,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ validate })
  }),
)

export { layer }
