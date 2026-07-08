export * as RuntimeMetrics from "./runtime-metrics"

import { Context, Effect, Layer, Ref } from "effect"

export interface Metrics {
  readonly executionDurationMs: number
  readonly retries: number
  readonly failures: number
  readonly cacheHits: number
  readonly cacheMisses: number
  readonly providerLatencyMs: number
  readonly modelLatencyMs: number
  readonly knowledgeSize: number
  readonly executionThroughput: number
}

export interface Interface {
  readonly recordExecution: (durationMs: number, knowledgeSize: number) => Effect.Effect<void>
  readonly recordRetry: () => Effect.Effect<void>
  readonly recordFailure: () => Effect.Effect<void>
  readonly recordCacheHit: () => Effect.Effect<void>
  readonly recordCacheMiss: () => Effect.Effect<void>
  readonly recordLatency: (providerMs: number, modelMs: number) => Effect.Effect<void>
  readonly get: Effect.Effect<Metrics>
  readonly reset: Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RuntimeMetrics") {}

function zero(): Metrics {
  return {
    executionDurationMs: 0,
    retries: 0,
    failures: 0,
    cacheHits: 0,
    cacheMisses: 0,
    providerLatencyMs: 0,
    modelLatencyMs: 0,
    knowledgeSize: 0,
    executionThroughput: 0,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<Metrics>(zero())

    const recordExecution = Effect.fn("RuntimeMetrics.recordExecution")(function* (durationMs: number, knowledgeSize: number) {
      yield* Ref.update(store, (m) => ({
        ...m,
        executionDurationMs: m.executionDurationMs + durationMs,
        knowledgeSize: m.knowledgeSize + knowledgeSize,
        executionThroughput: m.executionThroughput + 1,
      }))
    })

    const recordRetry = Effect.fn("RuntimeMetrics.recordRetry")(function* () {
      yield* Ref.update(store, (m) => ({ ...m, retries: m.retries + 1 }))
    })

    const recordFailure = Effect.fn("RuntimeMetrics.recordFailure")(function* () {
      yield* Ref.update(store, (m) => ({ ...m, failures: m.failures + 1 }))
    })

    const recordCacheHit = Effect.fn("RuntimeMetrics.recordCacheHit")(function* () {
      yield* Ref.update(store, (m) => ({ ...m, cacheHits: m.cacheHits + 1 }))
    })

    const recordCacheMiss = Effect.fn("RuntimeMetrics.recordCacheMiss")(function* () {
      yield* Ref.update(store, (m) => ({ ...m, cacheMisses: m.cacheMisses + 1 }))
    })

    const recordLatency = Effect.fn("RuntimeMetrics.recordLatency")(function* (providerMs: number, modelMs: number) {
      yield* Ref.update(store, (m) => ({
        ...m,
        providerLatencyMs: m.providerLatencyMs + providerMs,
        modelLatencyMs: m.modelLatencyMs + modelMs,
      }))
    })

    const get = Ref.get(store)
    const reset = Ref.set(store, zero())

    return Service.of({
      recordExecution, recordRetry, recordFailure,
      recordCacheHit, recordCacheMiss, recordLatency, get, reset,
    })
  }),
)

export { layer }
