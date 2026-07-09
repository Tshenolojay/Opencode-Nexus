export * as ToolHistoryConnector from "./tool-history-connector"

import { Context, Effect, Layer } from "effect"
import type { ConnectorResult, ExecutionPackage } from "../integration/execution-package"

export interface Interface {
  readonly prepare: (pkg: ExecutionPackage) => Effect.Effect<ConnectorResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ToolHistoryConnector") {}

const prepare: Interface["prepare"] = Effect.fn("ToolHistoryConnector.prepare")(function* (pkg) {
  const toolHistory = pkg.knowledgeBundle.toolHistory
  const hasData = (toolHistory?.length ?? 0) > 0

  return {
    sourceType: "tool-history",
    status: hasData ? "prepared" : "skipped",
    metadata: {
      toolCallCount: String(toolHistory?.length ?? 0),
    },
    confidence: hasData ? 0.85 : 0.2,
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
