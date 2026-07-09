export * as ContextPrioritizer from "./context-prioritizer"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export type ContextStrategy =
  | "repository-first"
  | "architecture-first"
  | "verification-first"
  | "planning-first"
  | "documentation-first"
  | "workflow-first"
  | "balanced"
  | "long-context"
  | "short-context"

export interface PrioritizedSection {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly priority: number
}

export interface PrioritizedContext {
  readonly sections: readonly PrioritizedSection[]
  readonly totalSize: number
  readonly strategy: ContextStrategy
}

export interface PrioritizeInput {
  readonly pkg: ExecutionPackage
  readonly strategy: ContextStrategy
  readonly maxChars: number
}

export interface Interface {
  readonly prioritize: (input: PrioritizeInput) => Effect.Effect<PrioritizedContext>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ContextPrioritizer") {}

function collectSections(pkg: ExecutionPackage): PrioritizedSection[] {
  const repo = pkg.repositoryIntelligence?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary
  const arch = pkg.architectureIntelligence?.summary ?? pkg.knowledgeBundle.architectureSummary
  const dep = pkg.dependencyIntelligence?.summary
  const doc = pkg.documentationIntelligence?.summary
  const ver = pkg.verificationIntelligence?.summary
  const plan = pkg.planningPolicy ? `Specialists: max ${pkg.planningPolicy.maxSpecialists}` : undefined
  const workflow = pkg.executionIntelligence?.workflowAdvice
  const reasoning = pkg.executionNarrative?.fullText?.slice(0, 800)

  const sections: { key: string; label: string; value: string | undefined }[] = [
    { key: "repository", label: "Repository", value: repo?.slice(0, 600) },
    { key: "architecture", label: "Architecture", value: arch?.slice(0, 500) },
    { key: "dependency", label: "Dependencies", value: dep?.slice(0, 400) },
    { key: "documentation", label: "Documentation", value: doc?.slice(0, 400) },
    { key: "verification", label: "Verification", value: ver?.slice(0, 400) },
    { key: "planning", label: "Planning", value: plan },
    { key: "workflow", label: "Workflow", value: workflow?.slice(0, 400) },
    { key: "reasoning", label: "Reasoning", value: reasoning },
  ]

  return sections.filter((s) => s.value).map((s, i) => ({ ...s, value: s.value!, priority: i + 1 }))
}

function orderSections(sections: PrioritizedSection[], strategy: ContextStrategy): PrioritizedSection[] {
  if (strategy === "balanced" || strategy === "long-context") return sections
  if (strategy === "short-context") return sections.filter((s) => s.key === "repository" || s.key === "workflow")

  const preferred = strategy.replace("-first", "")
  const ordered = [...sections]
  const idx = ordered.findIndex((s) => s.key === preferred)
  if (idx > 0) {
    const [item] = ordered.splice(idx, 1)
    ordered.unshift(item)
  }
  return ordered.map((s, i) => ({ ...s, priority: i + 1 }))
}

function truncate(sections: PrioritizedSection[], maxChars: number, strategy: ContextStrategy): PrioritizedSection[] {
  if (strategy === "long-context") return sections

  let total = 0
  const result: PrioritizedSection[] = []
  for (const s of sections) {
    const size = s.value.length
    if (total + size > maxChars && result.length > 0) break
    result.push(s)
    total += size
  }
  return result
}

const prioritize: Interface["prioritize"] = Effect.fn("ContextPrioritizer.prioritize")(function* (input) {
  const { pkg, strategy, maxChars } = input
  const sections = collectSections(pkg)
  const ordered = orderSections(sections, strategy)
  const truncated = truncate(ordered, maxChars, strategy)
  const totalSize = truncated.reduce((a, s) => a + s.value.length, 0)
  return { sections: truncated, totalSize, strategy }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ prioritize })
  }),
)

export { layer }
