export * as CloudExecutionAdapter from "./cloud-execution-adapter"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import type { ModelCandidate } from "./specialist-result"

export interface CloudExecutionRequest {
  readonly specialistID: string
  readonly providerID: string
  readonly modelID: string
  readonly prompt: string
  readonly systemPrompt: string | undefined
  readonly maxTokens: number
  readonly temperature: number
  readonly streaming: boolean
  readonly stopSequences: readonly string[] | undefined
}

export interface CloudExecutionResponse {
  readonly content: string
  readonly finishReason: string
  readonly tokensIn: number
  readonly tokensOut: number
  readonly durationMs: number
  readonly cost: number
  readonly modelID: string
  readonly providerID: string
}

export interface ExecutionAdapterRequest {
  readonly specialist: SpecialistProfile
  readonly model: ModelCandidate
  readonly objective: string
  readonly context: string
  readonly budget: {
    readonly maxTokens: number
    readonly maxTimeMs: number
    readonly maxCost: number
  }
}

export interface Interface {
  readonly prepare: (request: ExecutionAdapterRequest) => CloudExecutionRequest
  readonly execute: (request: CloudExecutionRequest) => Effect.Effect<CloudExecutionResponse>
  readonly estimateCost: (tokensIn: number, tokensOut: number) => number
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CloudExecutionAdapter") {}

function estimateCostPerToken(providerID: string): number {
  if (providerID.includes("openai") || providerID === "openai") return 0.000003
  if (providerID.includes("anthropic") || providerID === "anthropic") return 0.000008
  if (providerID.includes("google") || providerID === "google") return 0.000002
  if (providerID.includes("mistral") || providerID === "mistral") return 0.000002
  return 0.000004
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const result: Interface = {
      prepare: (request) => ({
        specialistID: request.specialist.id,
        providerID: request.model.providerID,
        modelID: request.model.modelID,
        prompt: `${request.objective}\n\n${request.context}`,
        systemPrompt: `You are ${request.specialist.name}, a specialist focused on ${request.specialist.purpose}`,
        maxTokens: request.budget.maxTokens,
        temperature: 0.3,
        streaming: false,
        stopSequences: undefined,
      }),

      execute: Effect.fn("CloudExecutionAdapter.execute")(function* (request) {
        const startTime = Date.now()
        const estimatedTokensIn = Math.ceil(request.prompt.length / 4)
        const estimatedTokensOut = Math.min(request.maxTokens, 2000)
        const estimatedCost = estimatedTokensIn * estimateCostPerToken(request.providerID) * 2

        yield* Effect.sleep(100)

        const durationMs = Date.now() - startTime

        return {
          content: `[${request.specialistID} execution on ${request.providerID}/${request.modelID}]`,
          finishReason: "stop",
          tokensIn: estimatedTokensIn,
          tokensOut: estimatedTokensOut,
          durationMs,
          cost: estimatedCost,
          modelID: request.modelID,
          providerID: request.providerID,
        }
      }),

      estimateCost: (tokensIn, tokensOut) => {
        return tokensIn * 0.000003 + tokensOut * 0.000012
      },
    }

    return Service.of(result)
  }),
)

export { layer }
