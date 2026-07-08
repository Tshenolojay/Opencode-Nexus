export * as KnowledgeCollector from "./knowledge-collector"

import { Context, Effect, Layer } from "effect"
import type { SpecialistResult, CollectedKnowledgeEntry } from "./specialist-result"

export interface CollectedKnowledge {
  readonly entries: readonly CollectedKnowledgeEntry[]
  readonly bySource: Readonly<Record<string, readonly CollectedKnowledgeEntry[]>>
  readonly totalConfidence: number
  readonly collectors: readonly string[]
}

export interface Interface {
  readonly collect: (results: readonly SpecialistResult[]) => Effect.Effect<CollectedKnowledge>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgeCollector") {}

const collect: Interface["collect"] = Effect.fn("KnowledgeCollector.collect")(function* (results) {
  const entries: CollectedKnowledgeEntry[] = []
  const sources: Record<string, CollectedKnowledgeEntry[]> = {}
  const collectors: string[] = []

  for (const result of results) {
    collectors.push(result.specialistID)
    for (const entry of result.collectedKnowledge) {
      entries.push(entry)
      if (!sources[entry.source]) sources[entry.source] = []
      sources[entry.source]!.push(entry)
    }
  }

  const totalConfidence = entries.length > 0
    ? entries.reduce((acc, e) => acc + e.confidence, 0) / entries.length
    : 0

  return {
    entries,
    bySource: sources,
    totalConfidence,
    collectors,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ collect })
  }),
)

export { layer }
