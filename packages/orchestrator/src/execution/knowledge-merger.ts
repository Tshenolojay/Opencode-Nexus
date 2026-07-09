export * as KnowledgeMerger from "./knowledge-merger"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { CollectedKnowledge } from "./knowledge-collector"
import type { SpecialistResult } from "./specialist-result"

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

function applyEntry(mut: Record<string, unknown>, entry: { type: string; content: string; source: string; confidence: number }, results: readonly SpecialistResult[] | undefined): void {
  switch (entry.type) {
    case "repository-summary":
      mut.repositorySummary = mergeText(mut.repositorySummary as string | undefined, entry.content, entry.confidence)
      break
    case "architecture-summary":
      mut.architectureSummary = mergeText(mut.architectureSummary as string | undefined, entry.content, entry.confidence)
      break
    case "architecture-notes":
      mut.architectureNotes = mergeText(mut.architectureNotes as string | undefined, entry.content, entry.confidence)
      break
    case "context-summary":
      mut.contextSummary = mergeText(mut.contextSummary as string | undefined, entry.content, entry.confidence)
      break
    case "conversation-summary":
      mut.conversationSummary = mergeText(mut.conversationSummary as string | undefined, entry.content, entry.confidence)
      break
    case "relevant-files":
      mut.relevantFiles = dedupe([...(mut.relevantFiles as readonly string[] ?? []), entry.content])
      break
    case "relevant-symbols":
      mut.relevantSymbols = dedupe([...(mut.relevantSymbols as readonly string[] ?? []), entry.content])
      break
    case "project-structure":
      mut.projectStructure = dedupe([...(mut.projectStructure as readonly string[] ?? []), entry.content])
      break
    case "search-results":
      mut.searchResults = (mut.searchResults as Array<{ file: string; content: string }> ?? [])
        .concat([{ file: entry.content, content: entry.source as string }])
        .filter((v, i, a) => a.findIndex((x) => x.file === v.file) === i)
      break
    case "dependency-graph":
      mut.dependencyGraph = (mut.dependencyGraph as Array<{ name: string; version: string; relationship: string }> ?? [])
        .concat([{ name: entry.content, version: "unknown", relationship: "unknown" }])
        .filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i)
      break
    case "dependencies":
      mut.dependencies = (mut.dependencies as Array<{ name: string; version: string; relationship: string }> ?? [])
        .concat([{ name: entry.content, version: "unknown", relationship: "unknown" }])
        .filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i)
      break
    case "documentation":
      mut.documentation = [
        ...(mut.documentation as readonly { path: string; summary: string; relevantSections: readonly string[] }[] ?? []),
        { path: entry.source, summary: entry.content, relevantSections: [] },
      ]
      break
    case "configuration":
      mut.configuration = [
        ...(mut.configuration as readonly { path: string; key: string; value: string | undefined }[] ?? []),
        { path: entry.source, key: entry.content, value: undefined },
      ]
      break
    case "external-references":
      mut.externalReferences = dedupe([...(mut.externalReferences as readonly string[] ?? []), entry.content])
      break
    case "external-knowledge":
      mut.externalKnowledge = dedupe([...(mut.externalKnowledge as readonly string[] ?? []), entry.content])
      break
    case "verification-results":
      mut.verificationResults = [
        ...(mut.verificationResults as readonly { target: string; passed: boolean; details: string }[] ?? []),
        { target: entry.content, passed: entry.confidence > 0.5, details: entry.source },
      ]
      break
    case "verification-notes":
      mut.verificationNotes = dedupe([...(mut.verificationNotes as readonly string[] ?? []), entry.content])
      break
    case "tool-history":
      mut.toolHistory = dedupe([...(mut.toolHistory as readonly string[] ?? []), entry.content])
      break
    default:
      break
  }
}

const merge: Interface["merge"] = Effect.fn("KnowledgeMerger.merge")(function* (input) {
  const mut: Record<string, unknown> = { ...input.base as unknown as Record<string, unknown> }

  for (const entry of input.collected.entries) {
    applyEntry(mut, entry, input.results)
  }

  if (input.results) {
    const executionNotes = input.results.flatMap((r) => r.warnings)
    if (executionNotes.length > 0) {
      const existing = mut.executionNotes as readonly string[] | undefined
      mut.executionNotes = dedupe([...(existing ?? []), ...executionNotes])
    }
  }

  return mut as unknown as KnowledgeBundle
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
