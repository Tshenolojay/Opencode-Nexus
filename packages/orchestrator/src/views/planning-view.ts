export * as PlanningView from "./planning-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface PlanningViewData {
  readonly capabilityCount: number
  readonly specialistCount: number
  readonly knowledgeRequestCount: number
  readonly maxSpecialists: number | undefined
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<PlanningViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PlanningView") {}

const project: Interface["project"] = Effect.fn("PlanningView.project")(function* (pkg) {
  return {
    capabilityCount: pkg.capabilityPlan?.required.length ?? 0,
    specialistCount: pkg.specialistPlan?.selected.length ?? 0,
    knowledgeRequestCount: pkg.knowledgePlan?.requests.length ?? 0,
    maxSpecialists: pkg.planningPolicy?.maxSpecialists,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
