export * as DocumentationView from "./documentation-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface DocumentationViewData {
  readonly summary: string | undefined
  readonly docCount: number
  readonly qualityIssues: number
  readonly missingCount: number
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<DocumentationViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DocumentationView") {}

const project: Interface["project"] = Effect.fn("DocumentationView.project")(function* (pkg) {
  const di = pkg.documentationIntelligence
  return {
    summary: di?.summary,
    docCount: di?.docs.length ?? 0,
    qualityIssues: di?.quality.length ?? 0,
    missingCount: di?.missing.length ?? 0,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
