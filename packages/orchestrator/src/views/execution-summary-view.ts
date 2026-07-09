export * as ExecutionSummaryView from "./execution-summary-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface ExecutionSummary {
  readonly taskType: string
  readonly complexity: number
  readonly confidence: string
  readonly hasSpecialistPlan: boolean
  readonly specialistCount: number
  readonly connectorCount: number
  readonly hasTeam: boolean
  readonly hasReasoning: boolean
  readonly hasWorkflow: boolean
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<ExecutionSummary>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionSummaryView") {}

const project: Interface["project"] = Effect.fn("ExecutionSummaryView.project")(function* (pkg) {
  return {
    taskType: pkg.taskClassification.type,
    complexity: pkg.taskClassification.complexity,
    confidence: pkg.confidence,
    hasSpecialistPlan: pkg.specialistPlan != null,
    specialistCount: pkg.specialistPlan?.selected.length ?? 0,
    connectorCount: pkg.connectorResults?.length ?? 0,
    hasTeam: pkg.virtualTeam != null,
    hasReasoning: pkg.executionNarrative != null,
    hasWorkflow: pkg.executionIntelligence?.workflowAdvice != null,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
