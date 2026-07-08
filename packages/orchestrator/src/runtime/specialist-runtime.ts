export * as SpecialistRuntime from "./specialist-runtime"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import { PromptBuilder } from "../prompts/prompt-builder"
import { RuntimeCache } from "./runtime-cache"
import { RuntimeValidator } from "./runtime-validator"
import { RuntimeFallback } from "./runtime-fallback"
import { RuntimeResult, fromSpecialistResult } from "./runtime-result"
import type { RuntimeContextData } from "./runtime-context"
import { SpecialistExecutor } from "../execution/specialist-executor"
import type { SpecialistResult } from "../execution/specialist-result"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { KnowledgePlan } from "../planner/knowledge-planner"
import type { CapabilityPlan } from "../planner/capability-planner"
import type { TaskType } from "../types/classification"

export interface RuntimeInput {
  readonly specialist: SpecialistProfile
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly knowledgeBundle: KnowledgeBundle
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
  readonly runtimeContext: RuntimeContextData
  readonly sessionID: string
}

export interface RuntimeOutput {
  readonly runtimeResult: RuntimeResult
  readonly specialistResult: SpecialistResult
  readonly cached: boolean
  readonly attempts: number
}

export interface Interface {
  readonly execute: (input: RuntimeInput) => Effect.Effect<RuntimeOutput>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistRuntime") {}

const execute: Interface["execute"] = Effect.fn("SpecialistRuntime.execute")(function* (input) {
  const cache = yield* RuntimeCache.Service
  const validator = yield* RuntimeValidator.Service
  const fallback = yield* RuntimeFallback.Service
  const promptBuilder = yield* PromptBuilder.Service
  const executor = yield* SpecialistExecutor.Service

  const cacheKey = `specialist:${input.specialist.id}:${input.taskType}` as const

  const cachedValue = yield* cache.get(cacheKey)
  if (cachedValue) {
    const cached: SpecialistResult = JSON.parse(cachedValue) as SpecialistResult
    const runtimeResult = fromSpecialistResult(cached, { attempt: 1, cacheHit: true })
    return { runtimeResult, specialistResult: cached, cached: true, attempts: 1 }
  }

  const prompt = yield* promptBuilder.buildPrompt(
    input.specialist.id,
    input.specialist.name,
    input.runtimeContext,
    input.taskObjective,
  )

  const maxAttempts = 3
  let lastResult: SpecialistResult | undefined
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = yield* executor.execute({
      specialist: input.specialist,
      taskObjective: prompt.userPrompt,
      taskType: input.taskType,
      knowledgeBundle: input.knowledgeBundle,
      knowledgePlan: input.knowledgePlan,
      capabilityPlan: input.capabilityPlan,
    }).pipe(
      Effect.either,
    )

    if (result._tag === "Right") {
      lastResult = result.right
      const validation = yield* validator.validate(
        fromSpecialistResult(result.right, { attempt, cacheHit: false }),
        input.specialist.preferredKnowledge,
      )

      if (validation.valid) {
        yield* cache.put(cacheKey, JSON.stringify(result.right))
        const runtimeResult = fromSpecialistResult(result.right, { attempt, cacheHit: false })
        return { runtimeResult, specialistResult: result.right, cached: false, attempts: attempt }
      }

      if (attempt < maxAttempts) {
        const fallbackDecision = yield* fallback.decide(
          fromSpecialistResult(result.right, { attempt, cacheHit: false }),
          {
            backupModel: undefined,
            attempts: attempt,
            maxAttempts,
          },
        )

        if (!fallbackDecision.shouldRetry) {
          const runtimeResult = fromSpecialistResult(result.right, { attempt, cacheHit: false })
          return { runtimeResult, specialistResult: result.right, cached: false, attempts: attempt }
        }
      }
    } else {
      lastError = result.left.message
    }
  }

  if (lastResult) {
    const runtimeResult = fromSpecialistResult(lastResult, { attempt: maxAttempts, cacheHit: false })
    return { runtimeResult, specialistResult: lastResult, cached: false, attempts: maxAttempts }
  }

  return yield* Effect.die(new Error(lastError ?? "Specialist execution failed after max attempts"))
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ execute })
  }),
)

export { layer }
