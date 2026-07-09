export * as ProviderRanking from "./provider-ranking"

import { Array, Context, Effect, Layer, Order } from "effect"
import { ProviderCatalog, type ProviderMetadata } from "./provider-catalog"
import type { Capability as CapabilityType } from "../types/capability"

export interface RankedProvider {
  readonly provider: ProviderMetadata
  readonly rankScore: number
  readonly reasoning: readonly string[]
}

export type RankingStrategy = "balanced" | "fastest" | "cheapest" | "most-reliable"

const STRATEGY_WEIGHTS: Record<RankingStrategy, { health: number; availability: number; latency: number; reliability: number; cost: number }> = {
  balanced: { health: 0.25, availability: 0.20, latency: 0.15, reliability: 0.25, cost: 0.15 },
  fastest: { health: 0.15, availability: 0.10, latency: 0.50, reliability: 0.15, cost: 0.10 },
  cheapest: { health: 0.10, availability: 0.10, latency: 0.15, reliability: 0.15, cost: 0.50 },
  "most-reliable": { health: 0.30, availability: 0.20, latency: 0.10, reliability: 0.30, cost: 0.10 },
}

export interface Interface {
  readonly rank: (strategy?: RankingStrategy) => Effect.Effect<readonly RankedProvider[]>
  readonly rankWithRequirements: (
    requiredCapabilities: readonly CapabilityType[],
    strategy?: RankingStrategy,
  ) => Effect.Effect<readonly RankedProvider[]>
  readonly getTopProvider: (strategy?: RankingStrategy) => Effect.Effect<RankedProvider | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ProviderRanking") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const providerCatalog = yield* ProviderCatalog.Service

    function scoreProvider(provider: ProviderMetadata, strategy: RankingStrategy): { score: number; reasons: string[] } {
      const weights = STRATEGY_WEIGHTS[strategy]
      const reasons: string[] = []

      const healthScore = provider.healthScore * weights.health
      if (provider.healthScore > 0.9) reasons.push("high health score")

      const availabilityScore = provider.availabilityScore * weights.availability
      if (provider.availabilityScore > 0.8) reasons.push("high availability")

      const latencyNorm = Math.max(0, 1 - provider.averageLatencyMs / 2000)
      const latencyScore = latencyNorm * weights.latency
      if (latencyNorm > 0.7) reasons.push("low latency")

      const reliabilityScore = provider.reliabilityScore * weights.reliability
      if (provider.reliabilityScore > 0.8) reasons.push("high reliability")

      const costNorm = Math.max(0, 1 - provider.averageCostPerToken / 0.1)
      const costScore = costNorm * weights.cost
      if (costNorm > 0.7) reasons.push("low cost")

      reasons.push(`${strategy} strategy`)

      const total = healthScore + availabilityScore + latencyScore + reliabilityScore + costScore
      return { score: total, reasons }
    }

    const result: Interface = {
      rank: Effect.fn("ProviderRanking.rank")(function* (strategy: RankingStrategy = "balanced") {
        const providers = yield* providerCatalog.availableProviders()
        const ranked: RankedProvider[] = providers.map((p) => {
          const { score, reasons } = scoreProvider(p, strategy)
          return { provider: p, rankScore: score, reasoning: reasons }
        })
        return Array.sort(ranked, Order.flip(Order.mapInput(Order.Number, (r: RankedProvider) => r.rankScore)))
      }),

      rankWithRequirements: Effect.fn("ProviderRanking.rankWithRequirements")(function* (requiredCapabilities, strategy: RankingStrategy = "balanced") {
        const providers = yield* providerCatalog.availableProviders()
        const ranked: RankedProvider[] = providers.map((p) => {
          const { score, reasons } = scoreProvider(p, strategy)
          if (requiredCapabilities.length > 0) {
            reasons.push(`${requiredCapabilities.length} required capabilities`)
          }
          return { provider: p, rankScore: score, reasoning: reasons }
        })
        return Array.sort(ranked, Order.flip(Order.mapInput(Order.Number, (r: RankedProvider) => r.rankScore)))
      }),

      getTopProvider: Effect.fn("ProviderRanking.getTopProvider")(function* (strategy: RankingStrategy = "balanced") {
        const ranked = yield* result.rank(strategy)
        return ranked[0]
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
