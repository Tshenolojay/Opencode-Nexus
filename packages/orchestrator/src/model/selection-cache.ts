export * as SelectionCache from "./selection-cache"

import { Context, Effect, Layer, Ref } from "effect"
import type { ModelMetadata } from "./model-catalog"
import type { ProviderMetadata } from "./provider-catalog"
import type { CapabilityIndexResult } from "./capability-discovery"
import type { RankedProvider } from "./provider-ranking"
import type { RankedModel } from "./model-ranking"

export interface CacheEntry<T> {
  readonly value: T
  readonly timestamp: number
  readonly ttlMs: number
}

export interface SelectionCacheState {
  readonly modelMetadata: CacheEntry<readonly ModelMetadata[]> | undefined
  readonly providerMetadata: CacheEntry<readonly ProviderMetadata[]> | undefined
  readonly capabilityIndex: CacheEntry<CapabilityIndexResult> | undefined
  readonly providerRankings: Map<string, CacheEntry<readonly RankedProvider[]>>
  readonly modelRankings: Map<string, CacheEntry<readonly RankedModel[]>>
}

export interface Interface {
  readonly getModels: () => Effect.Effect<readonly ModelMetadata[] | undefined>
  readonly setModels: (models: readonly ModelMetadata[], ttlMs?: number) => Effect.Effect<void>
  readonly getProviders: () => Effect.Effect<readonly ProviderMetadata[] | undefined>
  readonly setProviders: (providers: readonly ProviderMetadata[], ttlMs?: number) => Effect.Effect<void>
  readonly getCapabilityIndex: () => Effect.Effect<CapabilityIndexResult | undefined>
  readonly setCapabilityIndex: (index: CapabilityIndexResult, ttlMs?: number) => Effect.Effect<void>
  readonly getProviderRanking: (key: string) => Effect.Effect<readonly RankedProvider[] | undefined>
  readonly setProviderRanking: (key: string, ranking: readonly RankedProvider[], ttlMs?: number) => Effect.Effect<void>
  readonly getModelRanking: (key: string) => Effect.Effect<readonly RankedModel[] | undefined>
  readonly setModelRanking: (key: string, ranking: readonly RankedModel[], ttlMs?: number) => Effect.Effect<void>
  readonly invalidate: () => Effect.Effect<void>
  readonly invalidateKey: (key: string) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SelectionCache") {}

const DEFAULT_TTL_MS = 30_000

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* Ref.make<SelectionCacheState>({
      modelMetadata: undefined,
      providerMetadata: undefined,
      capabilityIndex: undefined,
      providerRankings: new Map(),
      modelRankings: new Map(),
    })

    function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
      if (!entry) return false
      return Date.now() - entry.timestamp < entry.ttlMs
    }

    const result: Interface = {
      getModels: Effect.fn("SelectionCache.getModels")(function* () {
        const s = yield* Ref.get(state)
        return isFresh(s.modelMetadata) ? s.modelMetadata.value : undefined
      }),

      setModels: Effect.fn("SelectionCache.setModels")(function* (models, ttlMs = DEFAULT_TTL_MS) {
        yield* Ref.update(state, (s) => ({
          ...s,
          modelMetadata: { value: models, timestamp: Date.now(), ttlMs },
        }))
      }),

      getProviders: Effect.fn("SelectionCache.getProviders")(function* () {
        const s = yield* Ref.get(state)
        return isFresh(s.providerMetadata) ? s.providerMetadata.value : undefined
      }),

      setProviders: Effect.fn("SelectionCache.setProviders")(function* (providers, ttlMs = DEFAULT_TTL_MS) {
        yield* Ref.update(state, (s) => ({
          ...s,
          providerMetadata: { value: providers, timestamp: Date.now(), ttlMs },
        }))
      }),

      getCapabilityIndex: Effect.fn("SelectionCache.getCapabilityIndex")(function* () {
        const s = yield* Ref.get(state)
        return isFresh(s.capabilityIndex) ? s.capabilityIndex.value : undefined
      }),

      setCapabilityIndex: Effect.fn("SelectionCache.setCapabilityIndex")(function* (index, ttlMs = DEFAULT_TTL_MS) {
        yield* Ref.update(state, (s) => ({
          ...s,
          capabilityIndex: { value: index, timestamp: Date.now(), ttlMs },
        }))
      }),

      getProviderRanking: Effect.fn("SelectionCache.getProviderRanking")(function* (key) {
        const s = yield* Ref.get(state)
        const entry = s.providerRankings.get(key)
        return isFresh(entry) ? entry.value : undefined
      }),

      setProviderRanking: Effect.fn("SelectionCache.setProviderRanking")(function* (key, ranking, ttlMs = DEFAULT_TTL_MS) {
        yield* Ref.update(state, (s) => {
          const next = new Map(s.providerRankings)
          next.set(key, { value: ranking, timestamp: Date.now(), ttlMs })
          return { ...s, providerRankings: next }
        })
      }),

      getModelRanking: Effect.fn("SelectionCache.getModelRanking")(function* (key) {
        const s = yield* Ref.get(state)
        const entry = s.modelRankings.get(key)
        return isFresh(entry) ? entry.value : undefined
      }),

      setModelRanking: Effect.fn("SelectionCache.setModelRanking")(function* (key, ranking, ttlMs = DEFAULT_TTL_MS) {
        yield* Ref.update(state, (s) => {
          const next = new Map(s.modelRankings)
          next.set(key, { value: ranking, timestamp: Date.now(), ttlMs })
          return { ...s, modelRankings: next }
        })
      }),

      invalidate: Effect.fn("SelectionCache.invalidate")(function* () {
        yield* Ref.set(state, {
          modelMetadata: undefined,
          providerMetadata: undefined,
          capabilityIndex: undefined,
          providerRankings: new Map(),
          modelRankings: new Map(),
        })
      }),

      invalidateKey: Effect.fn("SelectionCache.invalidateKey")(function* (key) {
        yield* Ref.update(state, (s) => {
          const nextProvider = new Map(s.providerRankings)
          nextProvider.delete(key)
          const nextModel = new Map(s.modelRankings)
          nextModel.delete(key)
          return { ...s, providerRankings: nextProvider, modelRankings: nextModel }
        })
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
