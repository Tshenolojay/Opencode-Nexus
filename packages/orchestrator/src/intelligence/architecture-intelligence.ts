export * as ArchitectureIntelligence from "./architecture-intelligence"

import { Context, Effect, Layer } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"

export interface SubsystemInfo {
  readonly name: string
  readonly files: readonly string[]
  readonly riskLevel: "low" | "medium" | "high"
}

export interface IntegrationPoint {
  readonly between: readonly string[]
  readonly pattern: string | undefined
  readonly riskLevel: "low" | "medium" | "high"
}

export interface ArchitectureAnalysis {
  readonly subsystems: readonly SubsystemInfo[]
  readonly integrationPoints: readonly IntegrationPoint[]
  readonly designPatterns: readonly string[]
  readonly risks: readonly string[]
  readonly summary: string
}

export interface Interface {
  readonly analyze: (bundle: KnowledgeBundle) => Effect.Effect<ArchitectureAnalysis>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ArchitectureIntelligence") {}

const analyze: Interface["analyze"] = Effect.fn("ArchitectureIntelligence.analyze")(function* (bundle) {
  const subsystems: SubsystemInfo[] = extractSubsystems(bundle)
  const integrationPoints: IntegrationPoint[] = extractIntegrationPoints(bundle)
  const risks = detectRisks(bundle, subsystems)

  const patterns = new Set<string>()
  if (bundle.architectureSummary) {
    const lower = bundle.architectureSummary.toLowerCase()
    if (lower.includes("pattern") || lower.includes("design")) {
      patterns.add("design-patterns")
    }
  }

  const summary = buildSummary(bundle, subsystems, integrationPoints, risks)

  return {
    subsystems,
    integrationPoints,
    designPatterns: [...patterns],
    risks,
    summary,
  }
})

function extractSubsystems(bundle: KnowledgeBundle): SubsystemInfo[] {
  const groups = new Map<string, string[]>()

  for (const file of bundle.relevantFiles) {
    const parts = file.split("/")
    const dir = parts.length > 2 ? parts.slice(0, 2).join("/") : parts[0] ?? "root"
    const existing = groups.get(dir) ?? []
    existing.push(file)
    groups.set(dir, existing)
  }

  return [...groups.entries()].map(([name, files]) => ({
    name,
    files,
    riskLevel: files.length > 5 ? "high" as const : files.length > 2 ? "medium" as const : "low" as const,
  }))
}

function extractIntegrationPoints(bundle: KnowledgeBundle): IntegrationPoint[] {
  const points: IntegrationPoint[] = []

  for (const dep of bundle.dependencyGraph) {
    points.push({
      between: [dep.name, "current"],
      pattern: dep.relationship,
      riskLevel: dep.relationship === "direct" ? "medium" as const : "low" as const,
    })
  }

  return points
}

function detectRisks(bundle: KnowledgeBundle, subsystems: SubsystemInfo[]): string[] {
  const risks: string[] = []

  const highRiskCount = subsystems.filter((s) => s.riskLevel === "high").length
  if (highRiskCount > 1) {
    risks.push(`${highRiskCount} subsystems have high file counts — may indicate poor separation of concerns`)
  }

  if (bundle.dependencyGraph.length > 10) {
    risks.push(`${bundle.dependencyGraph.length} external dependencies — review for unnecessary coupling`)
  }

  return risks
}

function buildSummary(bundle: KnowledgeBundle, subsystems: SubsystemInfo[], points: IntegrationPoint[], risks: string[]): string {
  const parts: string[] = []
  if (bundle.architectureSummary) parts.push(bundle.architectureSummary.slice(0, 300))
  parts.push(`${subsystems.length} subsystems identified`)
  parts.push(`${points.length} integration points`)
  if (risks.length > 0) parts.push(`${risks.length} architectural risk(s) detected`)

  return parts.join("\n")
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ analyze })
  }),
)

export { layer }
