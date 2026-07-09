export * as ModelRanking from "./model-ranking"

import { Array, Context, Effect, Layer, Order } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import type { Capability as CapabilityType, CapabilityRequirement } from "../types/capability"

export interface RankedModel {
  readonly model: ModelMetadata
  readonly rankScore: number
  readonly capabilityMatch: number
  readonly reasoning: readonly string[]
}

export interface ModelRankingResult {
  readonly primary: RankedModel | undefined
  readonly secondary: readonly RankedModel[]
  readonly fallback: RankedModel | undefined
  readonly emergencyFallback: RankedModel | undefined
  readonly equivalents: readonly RankedModel[]
}

export type ModelRankingStrategy = "balanced" | "fastest" | "cheapest" | "highest-quality" | "lowest-latency"

const STRATEGY_WEIGHTS: Record<ModelRankingStrategy, { capabilityMatch: number; quality: number; latency: number; cost: number; reliability: number; context: number }> = {
  balanced: { capabilityMatch: 0.35, quality: 0.25, latency: 0.10, cost: 0.10, reliability: 0.10, context: 0.10 },
  fastest: { capabilityMatch: 0.25, quality: 0.10, latency: 0.45, cost: 0.05, reliability: 0.10, context: 0.05 },
  cheapest: { capabilityMatch: 0.25, quality: 0.10, latency: 0.05, cost: 0.45, reliability: 0.10, context: 0.05 },
  "highest-quality": { capabilityMatch: 0.30, quality: 0.40, latency: 0.05, cost: 0.05, reliability: 0.10, context: 0.10 },
  "lowest-latency": { capabilityMatch: 0.20, quality: 0.10, latency: 0.50, cost: 0.05, reliability: 0.10, context: 0.05 },
}

const MATCH_THRESHOLD = 0.3
const FALLBACK_THRESHOLD = 0.1

export interface Interface {
  readonly rank: (requirements: readonly CapabilityRequirement[], strategy?: ModelRankingStrategy) => Effect.Effect<ModelRankingResult>
  readonly rankSimple: (requiredCapabilities: readonly CapabilityType[], strategy?: ModelRankingStrategy) => Effect.Effect<ModelRankingResult>
  readonly rankAll: (requirements: readonly CapabilityRequirement[], strategy?: ModelRankingStrategy) => Effect.Effect<readonly RankedModel[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelRanking") {}

function scoreModel(
  model: ModelMetadata,
  requirements: readonly CapabilityRequirement[],
  strategy: ModelRankingStrategy,
): { score: number; match: number; reasons: string[] } {
  const weights = STRATEGY_WEIGHTS[strategy]
  const reasons: string[] = []

  let capabilityScore = 0
  let totalWeight = 0

  for (const req of requirements) {
    totalWeight += req.weight
    if (model.capabilities.includes(req.capability)) {
      capabilityScore += req.weight * (req.optional ? 0.5 : 1.0)
      reasons.push(`has ${req.capability}`)
    } else {
      reasons.push(`missing ${req.capability}`)
    }
  }

  const capMatch = totalWeight > 0 ? capabilityScore / totalWeight : 0
  const capScore = capMatch * weights.capabilityMatch

  const qualityScore = model.qualityScore * weights.quality
  if (model.qualityScore > 0.9) reasons.push("high quality")

  const latencyNorm = Math.max(0, 1 - model.estimatedLatencyMs / 5000)
  const latencyScore = latencyNorm * weights.latency
  if (latencyNorm > 0.7) reasons.push("low latency")

  const costTotal = model.costPerInputToken + model.costPerOutputToken
  const costNorm = Math.max(0, 1 - costTotal / 0.5)
  const costScore = costNorm * weights.cost
  if (costNorm > 0.7) reasons.push("low cost")

  const reliabilityScore = model.reliabilityScore * weights.reliability
  if (model.reliabilityScore > 0.9) reasons.push("high reliability")

  const contextNorm = Math.min(1, model.contextLimit / 200000)
  const contextScore = contextNorm * weights.context
  if (contextNorm > 0.5) reasons.push("large context")

  reasons.push(`${strategy} strategy`)

  const total = capScore + qualityScore + latencyScore + costScore + reliabilityScore + contextScore
  return { score: total, match: capMatch, reasons }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const modelCatalog = yield* ModelCatalog.Service

    function getRanked(
      models: readonly ModelMetadata[],
      requirements: readonly CapabilityRequirement[],
      strategy: ModelRankingStrategy,
    ): readonly RankedModel[] {
      return models
        .map((m) => {
          const { score, match, reasons } = scoreModel(m, requirements, strategy)
          return { model: m, rankScore: score, capabilityMatch: match, reasoning: reasons } as RankedModel
        })
        .sort((a, b) => b.rankScore - a.rankScore)
    }

    const result: Interface = {
      rank: Effect.fn("ModelRanking.rank")(function* (requirements, strategy: ModelRankingStrategy = "balanced") {
        const models = yield* modelCatalog.availableModels()
        const ranked = getRanked(models, requirements, strategy)

        const primary = ranked[0]?.rankScore >= MATCH_THRESHOLD ? ranked[0] : undefined

        const secondary = ranked.filter((r) => r.model.modelID !== primary?.model.modelID && r.rankScore >= MATCH_THRESHOLD)

        const fallback = ranked.find((r) => r.rankScore < MATCH_THRESHOLD && r.rankScore >= FALLBACK_THRESHOLD)

        const emergencyFallback = ranked.length > 0 && !primary && !fallback
          ? ranked[ranked.length - 1]
          : undefined

        const equivalents = primary
          ? ranked.filter((r) =>
            r.model.modelID !== primary.model.modelID &&
            Math.abs(r.rankScore - primary.rankScore) < 0.1 &&
            r.rankScore >= MATCH_THRESHOLD,
          )
          : []

        return { primary, secondary, fallback, emergencyFallback, equivalents }
      }),

      rankSimple: Effect.fn("ModelRanking.rankSimple")(function* (requiredCapabilities, strategy: ModelRankingStrategy = "balanced") {
        const requirements: CapabilityRequirement[] = requiredCapabilities.map((c) => ({
          capability: c, weight: 1, optional: false,
        }))
        return yield* result.rank(requirements, strategy)
      }),

      rankAll: Effect.fn("ModelRanking.rankAll")(function* (requirements, strategy: ModelRankingStrategy = "balanced") {
        const models = yield* modelCatalog.availableModels()
        return getRanked(models, requirements, strategy)
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
