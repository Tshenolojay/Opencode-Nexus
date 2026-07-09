export * as ModelDiscovery from "./model-discovery"

import { Context, Effect, Layer } from "effect"
import { ModelCatalog } from "./model-catalog"
import { ProviderCatalog } from "./provider-catalog"
import type { ModelMetadata } from "./model-catalog"
import type { ProviderMetadata } from "./provider-catalog"

export interface DiscoveryResult {
  readonly newModels: readonly string[]
  readonly deprecatedModels: readonly string[]
  readonly unavailableModels: readonly string[]
  readonly unchangedModels: readonly string[]
  readonly totalModels: number
  readonly totalProviders: number
  readonly timestamp: number
}

export interface DiscoverySnapshot {
  readonly lastResult: DiscoveryResult | undefined
  readonly lastRefresh: number
}

export interface Interface {
  readonly discover: () => Effect.Effect<DiscoveryResult>
  readonly getLastResult: () => Effect.Effect<DiscoveryResult | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelDiscovery") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const modelCatalog = yield* ModelCatalog.Service
    const providerCatalog = yield* ProviderCatalog.Service

    let previousModels = new Map<string, ModelMetadata>()
    let lastResult: DiscoveryResult | undefined

    const result: Interface = {
      discover: Effect.fn("ModelDiscovery.discover")(function* () {
        const models = yield* modelCatalog.availableModels()
        const providers = yield* providerCatalog.availableProviders()

        const current = new Map<string, ModelMetadata>(models.map((m) => [`${m.providerID}:${m.modelID}`, m]))
        const previous = previousModels
        previousModels = current

        const newModels: string[] = []
        const deprecatedModels: string[] = []
        const unavailableModels: string[] = []
        const unchangedModels: string[] = []

        for (const key of current.keys()) {
          const model = current.get(key)!
          const prev = previous.get(key)
          if (!prev) {
            newModels.push(key)
          } else if (model.status === "deprecated" && prev.status !== "deprecated") {
            deprecatedModels.push(key)
          } else if (!model.enabled && prev.enabled) {
            unavailableModels.push(key)
          } else {
            unchangedModels.push(key)
          }
        }

        for (const key of previous.keys()) {
          if (!current.has(key)) {
            unavailableModels.push(key)
          }
        }

        lastResult = {
          newModels,
          deprecatedModels,
          unavailableModels,
          unchangedModels,
          totalModels: models.length,
          totalProviders: providers.length,
          timestamp: Date.now(),
        }

        return lastResult
      }),

      getLastResult: Effect.fn("ModelDiscovery.getLastResult")(function* () {
        return lastResult
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
