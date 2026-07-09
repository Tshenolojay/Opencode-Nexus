export * as ConversationConnector from "./conversation-connector"

import { Context, Effect, Layer } from "effect"
import type { ConnectorResult, ExecutionPackage } from "../integration/execution-package"

export interface Interface {
  readonly prepare: (pkg: ExecutionPackage) => Effect.Effect<ConnectorResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ConversationConnector") {}

const prepare: Interface["prepare"] = Effect.fn("ConversationConnector.prepare")(function* (pkg) {
  const convSummary = pkg.conversationSummary ?? pkg.knowledgeBundle.conversationSummary
  const hasData = convSummary != null

  return {
    sourceType: "conversation",
    status: hasData ? "prepared" : "skipped",
    metadata: {
      hasConversationSummary: convSummary != null ? "true" : "false",
      summaryLength: String((convSummary ?? "").length),
    },
    confidence: hasData ? 0.8 : 0.2,
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
