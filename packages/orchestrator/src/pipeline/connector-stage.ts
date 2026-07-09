import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { ConnectorCoordinator } from "../connectors/connector-coordinator"

export const runConnectorStage = Effect.fn("Pipeline.connector")(function* (state: PipelineState) {
  const connectorCoordinator = yield* ConnectorCoordinator.Service

  const connectorOutput = yield* connectorCoordinator.coordinate(state.executionPackage)
  const mut = state.executionPackage as unknown as Record<string, unknown>
  mut.connectorPlan = connectorOutput.plan
  mut.connectorResults = connectorOutput.results
  mut.connectorMetadata = connectorOutput.metadata
  mut.reusableKnowledgeSources = connectorOutput.results.filter((r) => r.status === "cached").map((r) => r.sourceType)

  const preparedCount = connectorOutput.results.filter((r) => r.status === "prepared").length
  const skippedCount = connectorOutput.results.filter((r) => r.status === "skipped").length

  return {
    ...state,
    diagnostics: [
      ...state.diagnostics,
      { phase: "knowledge-connectors", durationMs: 0, result: `prepared=${preparedCount} skipped=${skippedCount}`, error: undefined },
    ],
  } as PipelineState
})
