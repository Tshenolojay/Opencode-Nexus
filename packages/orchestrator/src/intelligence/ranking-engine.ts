export * as RankingEngine from "./ranking-engine"

import { Context, Effect, Layer } from "effect"
import type { CollectedKnowledgeEntry } from "../execution/specialist-result"

export interface RankedFragment {
  readonly entry: CollectedKnowledgeEntry
  readonly confidenceScore: number
  readonly freshnessScore: number
  readonly relevanceScore: number
  readonly verificationScore: number
  readonly sourceScore: number
  readonly compositeRank: number
}

export interface Interface {
  readonly rank: (entries: readonly CollectedKnowledgeEntry[], taskObjective: string) => Effect.Effect<readonly RankedFragment[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RankingEngine") {}

const rank: Interface["rank"] = Effect.fn("RankingEngine.rank")(function* (entries, taskObjective) {
  const now = Date.now()
  const taskWords = new Set(
    taskObjective.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
  )

  const ranked = entries.map((entry) => {
    const confidenceScore = entry.confidence

    const ageMs = now - entry.timestamp
    const freshnessScore = Math.max(0, 1 - ageMs / 86400000)

    const contentWords = entry.content.toLowerCase().split(/\W+/)
    const matches = [...taskWords].filter((w) => contentWords.includes(w)).length
    const relevanceScore = taskWords.size > 0 ? matches / taskWords.size : 0.5

    const verificationScore = confidenceScore >= 0.7 ? 1.0 : confidenceScore >= 0.4 ? 0.6 : 0.3

    const sourceScore = entry.source.includes("specialist/") ? 0.8
      : entry.source.includes("search") ? 0.6
        : 0.5

    const compositeRank = (
      confidenceScore * 0.35 +
      freshnessScore * 0.10 +
      relevanceScore * 0.30 +
      verificationScore * 0.15 +
      sourceScore * 0.10
    )

    return {
      entry,
      confidenceScore,
      freshnessScore,
      relevanceScore,
      verificationScore,
      sourceScore,
      compositeRank,
    }
  })

  ranked.sort((a, b) => b.compositeRank - a.compositeRank)

  return ranked
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ rank })
  }),
)

export { layer }
