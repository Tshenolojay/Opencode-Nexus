export * as KnowledgeMerger from "./knowledge-merger"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { CollectedKnowledge } from "./knowledge-collector"
import type { SpecialistResult } from "./specialist-result"
import type { RuntimeResult, RankedKnowledge } from "../runtime/runtime-result"
import type { TaskType } from "../types/classification"

export interface MergeInput {
  readonly base: KnowledgeBundle
  readonly collected: CollectedKnowledge
  readonly results: readonly SpecialistResult[] | undefined
}

export interface Interface {
  readonly merge: (input: MergeInput) => Effect.Effect<KnowledgeBundle>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgeMerger") {}

function dedupe<T>(arr: readonly T[]): readonly T[] {
  return [...new Set(arr)]
}

const merge: Interface["merge"] = Effect.fn("KnowledgeMerger.merge")(function* (input) {
  const base = input.base
  const collected = input.collected
  const merged: KnowledgeBundle = { ...base }

  for (const entry of collected.entries) {
    switch (entry.type) {
      case "repository-summary":
        merged.repositorySummary = mergeText(merged.repositorySummary, entry.content, entry.confidence)
        break
      case "architecture-summary":
        merged.architectureSummary = mergeText(merged.architectureSummary, entry.content, entry.confidence)
        break
      case "architecture-notes":
        merged.architectureNotes = mergeText(merged.architectureNotes, entry.content, entry.confidence)
        break
      case "context-summary":
        merged.contextSummary = mergeText(merged.contextSummary, entry.content, entry.confidence)
        break
      case "conversation-summary":
        merged.conversationSummary = mergeText(merged.conversationSummary, entry.content, entry.confidence)
        break
      case "relevant-files":
        merged.relevantFiles = dedupe([...merged.relevantFiles, entry.content])
        break
      case "relevant-symbols":
        merged.relevantSymbols = dedupe([...merged.relevantSymbols, entry.content])
        break
      case "project-structure":
        merged.projectStructure = dedupe([...(merged.projectStructure ?? []), entry.content])
        break
      case "search-results":
        merged.searchResults = dedupeBy(merged.searchResults, (s) => s.file, { file: entry.content, content: entry.source })
        break
      case "dependency-graph":
        merged.dependencyGraph = dedupeBy(merged.dependencyGraph, (d) => d.name, { name: entry.content, version: "unknown", relationship: "unknown" })
        break
      case "dependencies":
        merged.dependencies = dedupeBy(merged.dependencies ?? [], (d) => d.name, { name: entry.content, version: "unknown", relationship: "unknown" })
        break
      case "documentation":
        merged.documentation = [
          ...(merged.documentation ?? []),
          { path: entry.source, summary: entry.content, relevantSections: [] },
        ]
        break
      case "configuration":
        merged.configuration = [
          ...(merged.configuration ?? []),
          { path: entry.source, key: entry.content, value: undefined },
        ]
        break
      case "external-references":
        merged.externalReferences = dedupe([...merged.externalReferences, entry.content])
        break
      case "external-knowledge":
        merged.externalKnowledge = dedupe([...(merged.externalKnowledge ?? []), entry.content])
        break
      case "verification-results":
        merged.verificationResults = [
          ...merged.verificationResults,
          { target: entry.content, passed: entry.confidence > 0.5, details: entry.source },
        ]
        break
      case "verification-notes":
        merged.verificationNotes = dedupe([...(merged.verificationNotes ?? []), entry.content])
        break
      case "tool-history":
        merged.toolHistory = dedupe([...(merged.toolHistory ?? []), entry.content])
        break
      default:
        break
    }
  }

  if (input.results) {
    const executionNotes = input.results.flatMap((r) => r.warnings)
    if (executionNotes.length > 0) {
      merged.executionNotes = dedupe([...(merged.executionNotes ?? []), ...executionNotes])
    }
  }

  return merged
})

function mergeText(existing: string | undefined, incoming: string, confidence: number): string {
  if (!existing) return incoming
  if (confidence > 0.5) return incoming
  return `${existing}\n\n${incoming}`
}

function dedupeBy<T, K>(arr: readonly T[], keyFn: (item: T) => K, fallback: T): readonly T[] {
  const seen = new Set<K>()
  const result: T[] = []
  for (const item of arr) {
    const key = keyFn(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  if (result.length === 0 && fallback) {
    result.push(fallback)
  }
  return result
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ merge })
  }),
)

export { layer }

export function runtimeTaskType(base: KnowledgeBundle): TaskType {
  return base.taskType
}

// ── KnowledgeFusionEngine ──────────────────────────────────────────────

export interface FusionInput {
  readonly base: KnowledgeBundle
  readonly runtimeResults: readonly RuntimeResult[]
  readonly collected: CollectedKnowledge
}

export interface FusionEntry {
  readonly content: string
  readonly type: string
  readonly confidence: number
  readonly source: string
  readonly timestamp: number
  readonly provenance: ReadonlyArray<{
    readonly specialistID: string
    readonly providerID: string | undefined
    readonly modelID: string | undefined
  }>
  readonly conflicts: readonly string[]
}

export interface FusionReport {
  readonly entries: readonly FusionEntry[]
  readonly conflicts: readonly { readonly type: string; readonly values: readonly string[] }[]
  readonly totalConfidence: number
  readonly sourceAttribution: Readonly<Record<string, readonly string[]>>
}

export interface FusionInterface {
  readonly fuse: (input: FusionInput) => Effect.Effect<FusionReport>
}

export class FusionService extends Context.Service<FusionService, FusionInterface>()("@opencode/orchestrator/KnowledgeFusionEngine") {}

const fuse: FusionInterface["fuse"] = Effect.fn("KnowledgeFusionEngine.fuse")(function* (input) {
  const entries: FusionEntry[] = []
  const conflicts: { type: string; values: string[] }[] = []
  const sourceMap: Record<string, string[]> = {}

  const allKnowledge: RankedKnowledge[] = input.runtimeResults.flatMap((r) =>
    r.collectedKnowledge.map((k) => ({
      ...k,
      originatingProvider: r.provider,
      modelIdentifier: r.assignedModel?.modelID,
    })),
  )

  const byType = new Map<string, RankedKnowledge[]>()
  for (const k of allKnowledge) {
    const existing = byType.get(k.type) ?? []
    existing.push(k)
    byType.set(k.type, existing)
  }

  for (const [type, items] of byType) {
    const unique = new Map<string, RankedKnowledge>()
    for (const item of items) {
      const existing = unique.get(item.content)
      if (!existing || item.confidence > existing.confidence) {
        unique.set(item.content, item)
      }
    }

    const deduped = [...unique.values()]

    if (deduped.length > 1) {
      conflicts.push({
        type,
        values: deduped.map((d) => d.content.slice(0, 200)),
      })
    }

    deduped.sort((a, b) => b.confidence - a.confidence)

    for (const item of deduped) {
      const provenance = input.runtimeResults
        .filter((r) => r.collectedKnowledge.some((k) => k.content === item.content))
        .map((r) => ({
          specialistID: r.specialistID,
          providerID: r.provider,
          modelID: r.assignedModel?.modelID,
        }))

      const conflictingTypes = conflicts
        .filter((c) => c.type === type)
        .flatMap((c) => c.values)

      entries.push({
        content: item.content,
        type: item.type,
        confidence: item.confidence,
        source: item.source,
        timestamp: item.timestamp,
        provenance,
        conflicts: conflictingTypes,
      })
    }

    const sources = [...new Set(deduped.map((d) => d.source))]
    sourceMap[type] = sources
  }

  const totalConfidence = entries.length > 0
    ? entries.reduce((acc, e) => acc + e.confidence, 0) / entries.length
    : 0

  return { entries, conflicts, totalConfidence, sourceAttribution: sourceMap }
})

const fusionLayer = Layer.effect(
  FusionService,
  Effect.gen(function* () {
    return FusionService.of({ fuse })
  }),
)

export { fusionLayer }
