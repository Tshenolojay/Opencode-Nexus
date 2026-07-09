export * as DependencyView from "./dependency-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface DependencyViewData {
  readonly summary: string | undefined
  readonly chainCount: number
  readonly affectedPackageCount: number
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<DependencyViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DependencyView") {}

const project: Interface["project"] = Effect.fn("DependencyView.project")(function* (pkg) {
  const di = pkg.dependencyIntelligence
  return {
    summary: di?.summary,
    chainCount: di?.chains.length ?? 0,
    affectedPackageCount: di?.affectedPackages.length ?? 0,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
