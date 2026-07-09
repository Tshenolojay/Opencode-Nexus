export * as WorkflowView from "./workflow-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface WorkflowViewData {
  readonly workflowAdvice: string | undefined
  readonly executionStrategy: string | undefined
  readonly executionOrder: readonly string[] | undefined
  readonly teamSize: number
  readonly reviewStageCount: number
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<WorkflowViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/WorkflowView") {}

const project: Interface["project"] = Effect.fn("WorkflowView.project")(function* (pkg) {
  return {
    workflowAdvice: pkg.executionIntelligence?.workflowAdvice,
    executionStrategy: pkg.executionNarrative?.executionStrategy,
    executionOrder: pkg.dispatchPlan?.executionOrder?.flat(),
    teamSize: pkg.virtualTeam?.activeParticipants.length ?? 0,
    reviewStageCount: pkg.reviewPipeline?.stages.length ?? 0,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
