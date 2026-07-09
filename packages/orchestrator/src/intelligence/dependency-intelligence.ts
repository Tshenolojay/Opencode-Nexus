export * as DependencyIntelligence from "./dependency-intelligence"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle, DependencyInfo } from "../knowledge/knowledge"

export interface AffectedPackage {
  readonly name: string
  readonly version: string
  readonly relationship: string
  readonly impactLevel: "direct" | "transitive" | "unknown"
}

export interface DependencyChain {
  readonly root: string
  readonly chain: readonly string[]
  readonly depth: number
}

export interface DependencyAnalysis {
  readonly affectedPackages: readonly AffectedPackage[]
  readonly chains: readonly DependencyChain[]
  readonly blastRadius: number
  readonly summary: string
  readonly risks: readonly string[]
}

export interface Interface {
  readonly analyze: (bundle: KnowledgeBundle) => Effect.Effect<DependencyAnalysis>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/DependencyIntelligence") {}

const analyze: Interface["analyze"] = Effect.fn("DependencyIntelligence.analyze")(function* (bundle) {
  const allDeps = [...bundle.dependencyGraph, ...(bundle.dependencies ?? [])]
  const seen = new Set<string>()

  const affectedPackages: AffectedPackage[] = allDeps
    .filter((d) => {
      const key = `${d.name}@${d.version}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((d) => ({
      name: d.name,
      version: d.version,
      relationship: d.relationship,
      impactLevel: d.relationship === "direct" ? "direct" as const : "transitive" as const,
    }))

  const chains: DependencyChain[] = []
  for (const dep of allDeps) {
    const chain = buildChain(dep, allDeps, new Set(), 0)
    if (chain.length > 1) {
      chains.push({ root: dep.name, chain, depth: chain.length })
    }
  }

  const uniqueNames = new Set(allDeps.map((d) => d.name))
  const blastRadius = uniqueNames.size

  const summary = blastRadius === 0
    ? "No dependencies detected."
    : `${blastRadius} unique dependencies (${affectedPackages.filter((a) => a.impactLevel === "direct").length} direct, ${affectedPackages.filter((a) => a.impactLevel === "transitive").length} transitive). ${chains.length} dependency chains identified.`

  const risks: string[] = blastRadius > 5 ? [`${blastRadius} unique dependencies — review for unnecessary coupling`] : []
  return { affectedPackages, chains, blastRadius, summary, risks }
})

function buildChain(dep: DependencyInfo, all: readonly DependencyInfo[], visited: Set<string>, depth: number): readonly string[] {
  if (depth > 5 || visited.has(dep.name)) return [dep.name]
  visited.add(dep.name)

  const related = all.filter((d) => d.name !== dep.name && d.relationship === dep.relationship)
  for (const r of related) {
    const sub = buildChain(r, all, visited, depth + 1)
    if (sub.length > 0) return [dep.name, ...sub]
  }

  return [dep.name]
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ analyze })
  }),
)

export { layer }
