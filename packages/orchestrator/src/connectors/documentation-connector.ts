export * as DocumentationConnector from "./documentation-connector"

import { Context, Effect, Layer } from "effect"
import type { ConnectorResult, ExecutionPackage } from "../integration/execution-package"

export interface Interface {
  readonly prepare: (pkg: ExecutionPackage) => Effect.Effect<ConnectorResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DocumentationConnector") {}

const prepare: Interface["prepare"] = Effect.fn("DocumentationConnector.prepare")(function* (pkg) {
  const docIntel = pkg.documentationIntelligence
  const docBundle = pkg.knowledgeBundle.documentation

  const hasData = (docIntel?.docs.length ?? 0) > 0 || (docBundle?.length ?? 0) > 0

  return {
    sourceType: "documentation",
    status: hasData ? "prepared" : "skipped",
    metadata: {
      docCount: String(docIntel?.docs.length ?? docBundle?.length ?? 0),
      outdatedCount: String(docIntel?.outdated.length ?? 0),
      hasMissing: docIntel != null ? String(docIntel.missing.length > 0) : "false",
    },
    confidence: hasData ? 0.85 : 0.3,
    error: undefined,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ prepare })
  }),
)

export { layer }
