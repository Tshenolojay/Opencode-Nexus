export * as ConnectorView from "./connector-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage, ConnectorResult } from "../integration/execution-package"

export interface ConnectorSummary {
  readonly totalConnectors: number
  readonly cachedCount: number
  readonly freshCount: number
  readonly failedCount: number
  readonly sourceTypes: readonly string[]
  readonly hasRepository: boolean
  readonly hasDocumentation: boolean
  readonly hasConversation: boolean
  readonly hasToolHistory: boolean
  readonly planReused: boolean
  readonly planReuseCount: number
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<ConnectorSummary>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ConnectorView") {}

const project: Interface["project"] = Effect.fn("ConnectorView.project")(function* (pkg) {
  const results: readonly ConnectorResult[] = pkg.connectorResults ?? []

  return {
    totalConnectors: results.length,
    cachedCount: results.filter((r) => r.status === "cached").length,
    freshCount: results.filter((r) => r.status === "prepared").length,
    failedCount: results.filter((r) => r.status === "missing" || r.error).length,
    sourceTypes: results.map((r) => r.sourceType),
    hasRepository: results.some((r) => r.sourceType === "repository"),
    hasDocumentation: results.some((r) => r.sourceType === "documentation"),
    hasConversation: results.some((r) => r.sourceType === "conversation"),
    hasToolHistory: results.some((r) => r.sourceType === "tool-history"),
    planReused: (pkg.connectorMetadata?.reuseCount ?? 0) > 0,
    planReuseCount: pkg.connectorMetadata?.reuseCount ?? 0,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
