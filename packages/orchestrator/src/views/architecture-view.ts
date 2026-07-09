export * as ArchitectureView from "./architecture-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface ArchitectureViewData {
  readonly summary: string | undefined
  readonly subsystemCount: number
  readonly subsystems: readonly string[]
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<ArchitectureViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ArchitectureView") {}

const project: Interface["project"] = Effect.fn("ArchitectureView.project")(function* (pkg) {
  const ai = pkg.architectureIntelligence
  return {
    summary: ai?.summary ?? pkg.knowledgeBundle.architectureSummary,
    subsystemCount: ai?.subsystems.length ?? 0,
    subsystems: ai?.subsystems?.slice(0, 15).map((s) => s.name) ?? [],
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
