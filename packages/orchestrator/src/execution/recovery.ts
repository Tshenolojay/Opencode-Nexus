export * as FailureRecovery from "./recovery"

import { Context, Effect, Layer } from "effect"
import type { SpecialistResult } from "./specialist-result"

export interface RecoveryConfig {
  readonly maxRetries: number
  readonly retryDelayMs: number
  readonly timeoutMs: number
}

export const DefaultRecovery = {
  maxRetries: 3,
  retryDelayMs: 500,
  timeoutMs: 15000,
}

export interface RetryState {
  readonly attempts: number
  readonly lastError: string | undefined
}

export interface Interface {
  readonly attempt: <A, E>(
    execute: (state: RetryState) => Effect.Effect<A, E>,
    config?: Partial<RecoveryConfig>,
  ) => Effect.Effect<A, E>
  readonly fallback: <A, E>(
    primary: Effect.Effect<A, E>,
    fallback: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E>
  readonly withTimeout: <A, E>(
    effect: Effect.Effect<A, E>,
    timeoutMs: number,
  ) => Effect.Effect<A, E>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/FailureRecovery") {}

const attempt: Interface["attempt"] = function <A, E>(
  execute: (state: RetryState) => Effect.Effect<A, E>,
  config?: Partial<RecoveryConfig>,
) {
  const cfg = { ...DefaultRecovery, ...config }
  const loop = (attempts: number, lastError: string | undefined): Effect.Effect<A, E> =>
    execute({ attempts, lastError }).pipe(
      Effect.catchAll((error) => {
        if (attempts >= cfg.maxRetries) {
          return Effect.fail(error)
        }
        return Effect.sleep(cfg.retryDelayMs).pipe(
          Effect.andThen(loop(attempts + 1, String(error))),
        )
      }),
    )
  return loop(0, undefined)
}

const fallback: Interface["fallback"] = function <A, E>(
  primary: Effect.Effect<A, E>,
  fallbackEffect: Effect.Effect<A, E>,
) {
  return primary.pipe(
    Effect.catchAll(() => fallbackEffect),
  )
}

const withTimeout: Interface["withTimeout"] = function <A, E>(
  effect: Effect.Effect<A, E>,
  timeoutMs: number,
) {
  return effect.pipe(
    Effect.timeout(timeoutMs),
    Effect.catchAll(() => effect),
  )
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ attempt, fallback, withTimeout })
  }),
)

export { layer }
