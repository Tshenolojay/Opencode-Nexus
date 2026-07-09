export * as CapabilityDiscovery from "./capability-discovery"

import { Context, Effect, Layer, Array } from "effect"
import { ModelCatalog, type ModelMetadata } from "./model-catalog"
import { CapabilityRegistry } from "./capability-registry"
import type { Capability as CapabilityType } from "../types/capability"

export interface CapabilityModelIndex {
  readonly capability: CapabilityType
  readonly models: readonly string[]
  readonly modelCount: number
  readonly averageQuality: number
  readonly averageCost: number
  readonly completenessScore: number
}

export interface CapabilityIndexResult {
  readonly indexes: readonly CapabilityModelIndex[]
  readonly totalCapabilities: number
  readonly coveredCapabilities: number
  readonly coverageRatio: number
  readonly timestamp: number
}

export interface Interface {
  readonly buildIndex: () => Effect.Effect<CapabilityIndexResult>
  readonly findModelsByCapability: (capability: CapabilityType) => Effect.Effect<readonly ModelMetadata[]>
  readonly getLastIndex: () => Effect.Effect<CapabilityIndexResult | undefined>
  readonly scoreCompleteness: (capabilities: readonly CapabilityType[]) => Effect.Effect<number>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CapabilityDiscovery") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const modelCatalog = yield* ModelCatalog.Service
    const capRegistry = yield* CapabilityRegistry.Service

    let lastIndex: CapabilityIndexResult | undefined

    const buildIndex = Effect.fn("CapabilityDiscovery.buildIndex")(function* () {
      const allModels = yield* modelCatalog.availableModels()
      const allCapMetas = capRegistry.all()
      const indexes: CapabilityModelIndex[] = []

      let coveredCount = 0

      for (const meta of allCapMetas) {
        const cap = meta.capability
        const models = allModels.filter((m) => m.capabilities.includes(cap))
        const avgQuality = models.length > 0
          ? models.reduce((sum, m) => sum + m.qualityScore, 0) / models.length
          : 0
        const avgCost = models.length > 0
          ? models.reduce((sum, m) => sum + m.costPerInputToken + m.costPerOutputToken, 0) / models.length
          : 0
        const completenessScore = Math.min(1, models.length / 3)

        if (models.length > 0) coveredCount++

        indexes.push({
          capability: cap,
          models: models.map((m) => `${m.providerID}:${m.modelID}`),
          modelCount: models.length,
          averageQuality: avgQuality,
          averageCost: avgCost,
          completenessScore,
        })
      }

      const totalCapabilities = allCapMetas.length
      lastIndex = {
        indexes,
        totalCapabilities,
        coveredCapabilities: coveredCount,
        coverageRatio: totalCapabilities > 0 ? coveredCount / totalCapabilities : 0,
        timestamp: Date.now(),
      }

      return lastIndex
    })

    const result: Interface = {
      buildIndex,

      findModelsByCapability: Effect.fn("CapabilityDiscovery.findModelsByCapability")(function* (capability) {
        const all = yield* modelCatalog.availableModels()
        return all.filter((m) => m.capabilities.includes(capability))
      }),

      getLastIndex: Effect.fn("CapabilityDiscovery.getLastIndex")(function* () {
        return lastIndex
      }),

      scoreCompleteness: Effect.fn("CapabilityDiscovery.scoreCompleteness")(function* (capabilities) {
        const all = yield* modelCatalog.availableModels()
        if (capabilities.length === 0) return 1
        let matched = 0
        for (const cap of capabilities) {
          if (all.some((m) => m.capabilities.includes(cap))) matched++
        }
        return matched / capabilities.length
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
