export * as RuntimeFallback from "./runtime-fallback"

import { Context, Effect, Layer } from "effect"
import type { RuntimeResult } from "./runtime-result"
import type { ModelCandidate } from "../execution/specialist-result"

export interface FallbackDecision {
  readonly shouldRetry: boolean
  readonly useBackupModel: boolean
  readonly backupModel: ModelCandidate | undefined
  readonly terminateOrchestration: boolean
  readonly reason: string
}

export interface Interface {
  readonly decide: (
    result: RuntimeResult | undefined,
    input: {
      readonly backupModel: ModelCandidate | undefined
      readonly attempts: number
      readonly maxAttempts: number
    },
  ) => Effect.Effect<FallbackDecision>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RuntimeFallback") {}

const decide: Interface["decide"] = Effect.fn("RuntimeFallback.decide")(function* (result, input) {
  if (!result) {
    if (input.attempts >= input.maxAttempts) {
      return { shouldRetry: false, useBackupModel: false, backupModel: undefined, terminateOrchestration: false, reason: "no result after max attempts" }
    }
    return {
      shouldRetry: input.backupModel !== undefined,
      useBackupModel: input.backupModel !== undefined,
      backupModel: input.backupModel,
      terminateOrchestration: false,
      reason: "specialist produced no result; retrying with backup model if available",
    }
  }

  if (result.failures.length > 0) {
    if (input.attempts >= input.maxAttempts) {
      return { shouldRetry: false, useBackupModel: false, backupModel: undefined, terminateOrchestration: false, reason: "specialist failed after max attempts" }
    }
    return {
      shouldRetry: true,
      useBackupModel: input.backupModel !== undefined,
      backupModel: input.backupModel,
      terminateOrchestration: false,
      reason: "specialist reported failures; retrying",
    }
  }

  if (result.confidence < 0.3) {
    if (input.attempts >= input.maxAttempts) {
      return { shouldRetry: false, useBackupModel: false, backupModel: undefined, terminateOrchestration: false, reason: "low confidence after max attempts; continuing with partial result" }
    }
    return {
      shouldRetry: true,
      useBackupModel: input.backupModel !== undefined,
      backupModel: input.backupModel,
      terminateOrchestration: false,
      reason: "low confidence; retrying with backup model",
    }
  }

  return { shouldRetry: false, useBackupModel: false, backupModel: undefined, terminateOrchestration: false, reason: "specialist completed successfully" }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ decide })
  }),
)

export { layer }
