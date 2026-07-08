export * as DocumentationIntelligence from "./documentation-intelligence"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle, DocumentationEntry } from "../knowledge/knowledge"

export interface DocQuality {
  readonly path: string
  readonly summary: string
  readonly hasSummary: boolean
  readonly hasSections: boolean
  readonly qualityScore: number
}

export interface DocumentationAnalysis {
  readonly docs: readonly DocumentationEntry[]
  readonly quality: readonly DocQuality[]
  readonly outdated: readonly string[]
  readonly missing: readonly string[]
  readonly summary: string
}

export interface Interface {
  readonly analyze: (bundle: KnowledgeBundle) => Effect.Effect<DocumentationAnalysis>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DocumentationIntelligence") {}

const analyze: Interface["analyze"] = Effect.fn("DocumentationIntelligence.analyze")(function* (bundle) {
  const docs = bundle.documentation ?? []
  const quality: DocQuality[] = docs.map((d) => {
    const hasSummary = d.summary.length > 0
    const hasSections = d.relevantSections.length > 0
    const score = (hasSummary ? 0.4 : 0) + (hasSections ? 0.3 : 0) + (d.path.length > 0 ? 0.3 : 0)
    return {
      path: d.path,
      summary: d.summary,
      hasSummary,
      hasSections,
      qualityScore: score,
    }
  })

  const outdated = docs
    .filter((d) => d.summary.length < 10 || d.relevantSections.length === 0)
    .map((d) => d.path)

  const mentionedInCode = bundle.relevantFiles.filter((f) =>
    f.endsWith(".md") || f.endsWith(".mdx") || f.endsWith(".txt"),
  )
  const indexedPaths = new Set(docs.map((d) => d.path))
  const missing = mentionedInCode.filter((f) => !indexedPaths.has(f))

  const total = quality.length
  const avgScore = total > 0 ? quality.reduce((a, d) => a + d.qualityScore, 0) / total : 0
  const summary = total === 0
    ? "No documentation found."
    : `${total} documentation files analyzed. Average quality: ${(avgScore * 100).toFixed(0)}%. ${outdated.length} outdated, ${missing.length} missing.`

  return { docs, quality, outdated, missing, summary }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ analyze })
  }),
)

export { layer }
