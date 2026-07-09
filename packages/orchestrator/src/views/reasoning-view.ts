export * as ReasoningView from "./reasoning-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface ReasoningViewData {
  readonly narrative: string | undefined
  readonly consensus: string | undefined
  readonly decisionSummary: string | undefined
  readonly recommendationCount: number
  readonly riskCount: number
  readonly confidence: number | undefined
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<ReasoningViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ReasoningView") {}

const project: Interface["project"] = Effect.fn("ReasoningView.project")(function* (pkg) {
  const narrative = pkg.executionNarrative
  const consensus = pkg.specialistConsensus
  return {
    narrative: narrative?.fullText.slice(0, 1000),
    consensus: narrative?.specialistConsensus,
    decisionSummary: narrative?.confidenceSummary,
    recommendationCount: consensus?.recommendations.length ?? 0,
    riskCount: narrative?.risks?.length ?? 0,
    confidence: consensus?.overallConfidence ?? pkg.reasoningConfidence,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
