export * as RepositoryIntelligence from "./repository-intelligence"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"

export interface HotspotInfo {
  readonly file: string
  readonly mentionCount: number
  readonly mentionedBy: readonly string[]
  readonly priority: number
}

export interface ChangeImpact {
  readonly files: readonly string[]
  readonly riskLevel: "low" | "medium" | "high"
  readonly estimatedScope: string
}

export interface RepositoryAnalysis {
  readonly importantModules: readonly string[]
  readonly hotspots: readonly HotspotInfo[]
  readonly affectedAreas: readonly string[]
  readonly changeImpact: ChangeImpact | undefined
  readonly enrichedSummary: string
}

export interface Interface {
  readonly analyze: (bundle: KnowledgeBundle) => Effect.Effect<RepositoryAnalysis>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RepositoryIntelligence") {}

const analyze: Interface["analyze"] = Effect.fn("RepositoryIntelligence.analyze")(function* (bundle) {
  const mentionMap = new Map<string, { count: number; sources: string[] }>()

  for (const file of bundle.relevantFiles) {
    const entry = mentionMap.get(file) ?? { count: 0, sources: [] }
    entry.count++
    entry.sources.push("relevant-files")
    mentionMap.set(file, entry)
  }

  for (const result of bundle.searchResults) {
    const entry = mentionMap.get(result.file) ?? { count: 0, sources: [] }
    entry.count++
    entry.sources.push("search-results")
    mentionMap.set(result.file, entry)
  }

  const hotspots: HotspotInfo[] = [...mentionMap.entries()]
    .filter(([, v]) => v.count > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([file, v]) => ({
      file,
      mentionCount: v.count,
      mentionedBy: [...new Set(v.sources)],
      priority: Math.min(v.count, 5),
    }))

  const importantModules = [...mentionMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([file]) => file)

  const affectedAreas: string[] = []
  if (bundle.repositorySummary) affectedAreas.push(bundle.repositorySummary.slice(0, 100))
  if (bundle.architectureSummary) affectedAreas.push(bundle.architectureSummary.slice(0, 100))
  for (const dep of bundle.dependencyGraph) {
    affectedAreas.push(`${dep.name} (${dep.relationship})`)
  }

  const riskLevel: ChangeImpact["riskLevel"] =
    bundle.dependencyGraph.length > 5 ? "high"
      : bundle.dependencyGraph.length > 2 ? "medium"
        : "low"

  const changeImpact: ChangeImpact = {
    files: [...new Set([...bundle.relevantFiles, ...bundle.searchResults.map((r) => r.file)])],
    riskLevel,
    estimatedScope: `${bundle.dependencyGraph.length} dependencies, ${bundle.relevantFiles.length} relevant files`,
  }

  const hotList = hotspots.length > 0
    ? `\nHotspots:\n${hotspots.map((h) => `  ${h.file} (mentioned ${h.mentionCount}x)`).join("\n")}`
    : ""

  const enrichedSummary = `Analysis for ${bundle.taskType} task.${hotList}\nChange impact: ${changeImpact.riskLevel} risk across ${changeImpact.files.length} files.`

  return {
    importantModules,
    hotspots,
    affectedAreas,
    changeImpact,
    enrichedSummary,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ analyze })
  }),
)

export { layer }
