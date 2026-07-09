export * as KnowledgeConnector from "./knowledge-connector"

import { Context, Effect, Layer } from "effect"
import type { ConnectorResult, ExecutionPackage, KnowledgeSourceType } from "../integration/execution-package"
import { RepositoryConnector } from "./repository-connector"
import { DocumentationConnector } from "./documentation-connector"
import { ConversationConnector } from "./conversation-connector"
import { ToolHistoryConnector } from "./tool-history-connector"

export interface Interface {
  readonly request: (input: { readonly sourceType: KnowledgeSourceType; readonly specialistID?: string; readonly filters?: Readonly<Record<string, string>> }) => Effect.Effect<ConnectorResult>
  readonly query: (pkg: ExecutionPackage, sourceType: KnowledgeSourceType) => Effect.Effect<ConnectorResult>
  readonly queryAll: (pkg: ExecutionPackage, types: readonly KnowledgeSourceType[]) => Effect.Effect<readonly ConnectorResult[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgeConnector") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const repo = yield* RepositoryConnector.Service
    const docs = yield* DocumentationConnector.Service
    const conv = yield* ConversationConnector.Service
    const tools = yield* ToolHistoryConnector.Service

    const query: Interface["query"] = Effect.fn("KnowledgeConnector.query")(function* (pkg, sourceType) {
      switch (sourceType) {
        case "repository":
          return yield* repo.prepare(pkg)
        case "documentation":
          return yield* docs.prepare(pkg)
        case "conversation":
          return yield* conv.prepare(pkg)
        case "tool-history":
          return yield* tools.prepare(pkg)
        default:
          return {
            sourceType,
            status: "skipped" as const,
            metadata: {},
            confidence: 0,
            error: `Unknown source type: ${sourceType}`,
          }
      }
    })

    const queryAll: Interface["queryAll"] = Effect.fn("KnowledgeConnector.queryAll")(function* (pkg, types) {
      const results: ConnectorResult[] = []
      for (const t of types) {
        results.push(yield* query(pkg, t))
      }
      return results
    })

    const request: Interface["request"] = Effect.fn("KnowledgeConnector.request")(function* (input) {
      const pkg = {
        connectorPlan: {
          requests: [{
            sourceType: input.sourceType,
            specialistID: input.specialistID,
            priority: 1,
            filters: input.filters ?? {},
          }],
          totalPriority: 1,
          hasRequiredSources: true,
        },
        knowledgeBundle: {
          relevantFiles: [],
          repositorySummary: undefined,
          conversationSummary: input.sourceType === "conversation" ? "requested" : undefined,
          toolHistory: input.sourceType === "tool-history" ? [] : undefined,
          contextSummary: undefined,
        },
        repositoryIntelligence: undefined,
      } as unknown as ExecutionPackage
      return yield* query(pkg, input.sourceType)
    })

    return Service.of({ query, queryAll, request })
  }),
).pipe(
  Layer.provide(RepositoryConnector.layer),
  Layer.provide(DocumentationConnector.layer),
  Layer.provide(ConversationConnector.layer),
  Layer.provide(ToolHistoryConnector.layer),
)

export { layer }
