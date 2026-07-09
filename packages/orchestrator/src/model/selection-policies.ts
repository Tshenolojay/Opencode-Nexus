export * as SelectionPolicies from "./selection-policies"

import { Context, Effect, Layer } from "effect"
import type { CapabilityRequirement } from "../types/capability"
import type { ModelRankingStrategy } from "./model-ranking"
import type { RankingStrategy } from "./provider-ranking"

export interface SelectionPolicy {
  readonly name: string
  readonly description: string
  readonly modelStrategy: ModelRankingStrategy
  readonly providerStrategy: RankingStrategy
  readonly requireExactCapabilityMatch: boolean
  readonly minimumMatchScore: number
  readonly preferStreaming: boolean
  readonly preferVision: boolean
  readonly maxFallbackAttempts: number
  readonly preferCheapForOptional: boolean
}

export const LOWEST_COST: SelectionPolicy = {
  name: "lowest-cost",
  description: "Select the cheapest model that meets minimum capability requirements",
  modelStrategy: "cheapest",
  providerStrategy: "cheapest",
  requireExactCapabilityMatch: false,
  minimumMatchScore: 0.3,
  preferStreaming: false,
  preferVision: false,
  maxFallbackAttempts: 2,
  preferCheapForOptional: true,
}

export const HIGHEST_QUALITY: SelectionPolicy = {
  name: "highest-quality",
  description: "Select the highest quality model regardless of cost",
  modelStrategy: "highest-quality",
  providerStrategy: "most-reliable",
  requireExactCapabilityMatch: true,
  minimumMatchScore: 0.5,
  preferStreaming: true,
  preferVision: true,
  maxFallbackAttempts: 3,
  preferCheapForOptional: false,
}

export const BALANCED: SelectionPolicy = {
  name: "balanced",
  description: "Balanced selection considering quality, cost, and latency",
  modelStrategy: "balanced",
  providerStrategy: "balanced",
  requireExactCapabilityMatch: false,
  minimumMatchScore: 0.3,
  preferStreaming: true,
  preferVision: false,
  maxFallbackAttempts: 2,
  preferCheapForOptional: true,
}

export const FASTEST: SelectionPolicy = {
  name: "fastest",
  description: "Select the fastest model for interactive use cases",
  modelStrategy: "fastest",
  providerStrategy: "fastest",
  requireExactCapabilityMatch: false,
  minimumMatchScore: 0.2,
  preferStreaming: true,
  preferVision: false,
  maxFallbackAttempts: 1,
  preferCheapForOptional: true,
}

export const HIGHEST_QUALITY_CHEAP: SelectionPolicy = {
  name: "highest-quality-cheap",
  description: "Highest quality within a reasonable cost range",
  modelStrategy: "highest-quality",
  providerStrategy: "balanced",
  requireExactCapabilityMatch: true,
  minimumMatchScore: 0.4,
  preferStreaming: true,
  preferVision: true,
  maxFallbackAttempts: 2,
  preferCheapForOptional: true,
}

const ALL_POLICIES: readonly SelectionPolicy[] = [
  LOWEST_COST, HIGHEST_QUALITY, BALANCED, FASTEST, HIGHEST_QUALITY_CHEAP,
]

export const DEFAULT_POLICY = BALANCED

export interface PolicySelectorInput {
  readonly taskComplexity: number
  readonly requiresStreaming: boolean
  readonly requiresVision: boolean
  readonly requiresCheapExecution: boolean
  readonly requiresHighQuality: boolean
  readonly requiresFastResponse: boolean
  readonly capabilityCount: number
}

export interface Interface {
  readonly getPolicy: (name: string) => SelectionPolicy | undefined
  readonly selectPolicy: (input: PolicySelectorInput) => SelectionPolicy
  readonly allPolicies: () => readonly SelectionPolicy[]
  readonly applyPolicy: (requirements: readonly CapabilityRequirement[], policy: SelectionPolicy) => {
    readonly adjustedRequirements: readonly CapabilityRequirement[]
    readonly adjustedStrategy: ModelRankingStrategy
  }
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SelectionPolicies") {}

const POLICY_BY_NAME = new Map<string, SelectionPolicy>(ALL_POLICIES.map((p) => [p.name, p]))

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({
      getPolicy: (name) => POLICY_BY_NAME.get(name),

      selectPolicy: (input) => {
        if (input.requiresHighQuality) return HIGHEST_QUALITY
        if (input.requiresFastResponse) return FASTEST
        if (input.requiresCheapExecution) return LOWEST_COST
        if (input.taskComplexity > 0.7) return HIGHEST_QUALITY_CHEAP
        return DEFAULT_POLICY
      },

      allPolicies: () => ALL_POLICIES,

      applyPolicy: (requirements, policy) => {
        const adjusted = requirements.map((r) => {
          if (policy.preferCheapForOptional && r.optional) {
            return { ...r, weight: r.weight * 0.5 }
          }
          if (policy.requireExactCapabilityMatch && !r.optional) {
            return { ...r, weight: r.weight * 1.5 }
          }
          return r
        })
        return { adjustedRequirements: adjusted, adjustedStrategy: policy.modelStrategy }
      },
    })
  }),
)

export { layer }
