export * as AgentEnhancer from "./agent-enhancer"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"
import type { AgentContextProfile } from "./agent-context"

export interface EnhancedPackage {
  readonly original: ExecutionPackage
  readonly profile: AgentContextProfile
  readonly relevantSummary: string
  readonly suppressedCount: number
}

export interface Interface {
  readonly enhance: (pkg: ExecutionPackage, profile: AgentContextProfile) => Effect.Effect<EnhancedPackage>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/AgentEnhancer") {}

const enhance: Interface["enhance"] = Effect.fn("AgentEnhancer.enhance")(function* (pkg, profile) {
  const sections: string[] = []
  let suppressedCount = 0

  const sectionMap: Record<string, () => string | undefined> = {
    repositoryIntelligence: () => pkg.repositoryIntelligence?.enrichedSummary,
    dependencyIntelligence: () => pkg.dependencyIntelligence?.summary,
    architectureIntelligence: () => pkg.architectureIntelligence?.summary,
    documentationIntelligence: () => pkg.documentationIntelligence?.summary,
    verificationIntelligence: () => pkg.verificationIntelligence?.summary,
    contextIntelligence: () => pkg.contextIntelligence?.optimizedSummary,
    conversationSummary: () => pkg.conversationSummary,
    knowledgeBundle: () => {
      const kb = pkg.knowledgeBundle
      const parts: string[] = []
      if (kb.repositorySummary) parts.push(`Repository: ${kb.repositorySummary.slice(0, 200)}`)
      if (kb.architectureSummary) parts.push(`Architecture: ${kb.architectureSummary.slice(0, 200)}`)
      if (kb.relevantFiles.length > 0) parts.push(`Relevant files: ${kb.relevantFiles.slice(0, 10).join(", ")}`)
      return parts.length > 0 ? parts.join("\n") : undefined
    },
  }

  for (const [section, fn] of Object.entries(sectionMap)) {
    if (profile.suppressedSections.includes(section)) {
      suppressedCount++
      continue
    }

    const value = fn()
    if (value) {
      sections.push(value)
    }
  }

  sections.sort((a, b) => {
    const keyA = Object.keys(sectionMap).find((k) => sectionMap[k]() === a) ?? ""
    const keyB = Object.keys(sectionMap).find((k) => sectionMap[k]() === b) ?? ""
    const weightA = profile.emphasis[keyA] ?? 0
    const weightB = profile.emphasis[keyB] ?? 0
    return weightB - weightA
  })

  return {
    original: pkg,
    profile,
    relevantSummary: sections.join("\n\n"),
    suppressedCount,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ enhance })
  }),
)

export { layer }
