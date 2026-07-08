export * as VerificationIntelligence from "./verification-intelligence"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle, VerificationResult } from "../knowledge/knowledge"

export interface ConflictingFinding {
  readonly target: string
  readonly results: readonly { passed: boolean; details: string }[]
  readonly resolution: "conflict" | "agreed" | "ambiguous"
}

export interface VerificationAnalysis {
  readonly mergedResults: readonly VerificationResult[]
  readonly conflicts: readonly ConflictingFinding[]
  readonly unresolvedIssues: readonly string[]
  readonly confidence: number
  readonly recommendations: readonly string[]
  readonly summary: string
}

export interface Interface {
  readonly analyze: (bundle: KnowledgeBundle) => Effect.Effect<VerificationAnalysis>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/VerificationIntelligence") {}

const analyze: Interface["analyze"] = Effect.fn("VerificationIntelligence.analyze")(function* (bundle) {
  const results = bundle.verificationResults
  const byTarget = new Map<string, VerificationResult[]>()

  for (const result of results) {
    const existing = byTarget.get(result.target) ?? []
    existing.push(result)
    byTarget.set(result.target, existing)
  }

  const conflicts: ConflictingFinding[] = []
  const unresolved: string[] = []

  for (const [target, targetResults] of byTarget) {
    const unique = new Set(targetResults.map((r) => `${r.passed}:${r.details}`))
    if (unique.size > 1) {
      conflicts.push({
        target,
        results: targetResults,
        resolution: targetResults.every((r) => r.passed) ? "agreed" as const
          : targetResults.every((r) => !r.passed) ? "agreed" as const
            : "conflict" as const,
      })
    }
    if (targetResults.every((r) => !r.passed)) {
      unresolved.push(target)
    }
  }

  const allPassed = results.every((r) => r.passed)
  const totalCount = results.length
  const passedCount = results.filter((r) => r.passed).length
  const confidence = totalCount > 0 ? passedCount / totalCount : 0

  const recommendations: string[] = []
  if (conflicts.length > 0) recommendations.push(`Resolve ${conflicts.length} conflicting verification result(s)`)
  if (unresolved.length > 0) recommendations.push(`Address ${unresolved.length} unresolved issue(s): ${unresolved.slice(0, 3).join(", ")}`)
  if (totalCount === 0) recommendations.push("No verification results — consider adding verification steps")

  const summary = totalCount === 0
    ? "No verification results available."
    : `Verification: ${passedCount}/${totalCount} passed (${(confidence * 100).toFixed(0)}%). ${conflicts.length} conflicts, ${unresolved.length} unresolved.`

  return { mergedResults: results, conflicts, unresolvedIssues: unresolved, confidence, recommendations, summary }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ analyze })
  }),
)

export { layer }
