export * as ContextCompressor from "./context-compressor"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export type CompressionStrategy =
  | "repository-first"
  | "architecture-first"
  | "verification-first"
  | "planning-first"
  | "documentation-first"
  | "workflow-first"
  | "balanced"
  | "long-context"
  | "short-context"

export interface CompressionResult {
  readonly compressedContext: string
  readonly originalSize: number
  readonly compressedSize: number
  readonly savedBytes: number
  readonly removedDuplicates: number
  readonly preservedSections: readonly string[]
}

export interface Interface {
  readonly compress: (pkg: ExecutionPackage) => Effect.Effect<CompressionResult>
  readonly compressWithStrategy: (pkg: ExecutionPackage, strategy: CompressionStrategy) => Effect.Effect<CompressionResult>
  readonly compressReasoning: (
    narrative: string,
    consensusPoints: readonly string[],
    recommendations: readonly string[],
  ) => Effect.Effect<CompressionResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ContextCompressor") {}

const MAX_SECTION = 600
const MAX_TOTAL = 2400

const compress: Interface["compress"] = Effect.fn("ContextCompressor.compress")(function* (pkg) {
  const sections: { key: string; value: string }[] = []

  const repo = pkg.repositoryIntelligence?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary
  if (repo) sections.push({ key: "repository", value: repo })

  const arch = pkg.architectureIntelligence?.summary ?? pkg.knowledgeBundle.architectureSummary
  if (arch) sections.push({ key: "architecture", value: arch })

  const dep = pkg.dependencyIntelligence?.summary
  if (dep) sections.push({ key: "dependency", value: dep })

  const doc = pkg.documentationIntelligence?.summary
  if (doc) sections.push({ key: "documentation", value: doc })

  const ver = pkg.verificationIntelligence?.summary
  if (ver) sections.push({ key: "verification", value: ver })

  if (pkg.conversationSummary) sections.push({ key: "conversation", value: pkg.conversationSummary })

  if (pkg.knowledgeBundle.contextSummary) sections.push({ key: "context", value: pkg.knowledgeBundle.contextSummary })

  const plan = pkg.planningPolicy
    ? `Policy: max ${pkg.planningPolicy.maxSpecialists} specialists, ${pkg.planningPolicy.maxParallelism ?? 1} parallel`
    : undefined
  if (plan) sections.push({ key: "planning", value: plan })

  const intel = pkg.executionIntelligence
  if (intel?.executionRisks && intel.executionRisks.length > 0) {
    sections.push({
      key: "risks",
      value: intel.executionRisks.map((r) => `[${r.severity}] ${r.risk}`).join("; "),
    })
  }
  if (intel?.executionRecommendations && intel.executionRecommendations.length > 0) {
    sections.push({
      key: "recommendations",
      value: intel.executionRecommendations.map((r) => `(${r.priority}) ${r.recommendation}`).join("; "),
    })
  }

  const truncated = sections.map((s) => ({ ...s, value: s.value.length > MAX_SECTION ? `${s.value.slice(0, MAX_SECTION)}…` : s.value }))

  const seen = new Set<string>()
  let removedDuplicates = 0
  const deduped = truncated.filter((s) => {
    const normalized = s.value.replace(/\s+/g, " ").trim().toLowerCase()
    if (seen.has(normalized)) {
      removedDuplicates++
      return false
    }
    seen.add(normalized)
    return true
  })

  let total = 0
  const preserved: string[] = []
  const output: string[] = []
  for (const s of deduped) {
    if (total + s.value.length > MAX_TOTAL && preserved.length > 0) break
    output.push(`${s.key.toUpperCase()}:\n${s.value}`)
    preserved.push(s.key)
    total += s.value.length
  }

  const compressed = output.join("\n\n")
  const originalSize = sections.reduce((acc, s) => acc + s.value.length, 0)

  return {
    compressedContext: compressed,
    originalSize,
    compressedSize: total,
    savedBytes: Math.max(0, originalSize - total),
    removedDuplicates,
    preservedSections: preserved,
  }
})

const compressReasoning: Interface["compressReasoning"] = Effect.fn("ContextCompressor.compressReasoning")(function* (narrative, consensusPoints, recommendations) {
  const sections: { key: string; value: string }[] = []
  if (narrative) sections.push({ key: "narrative", value: narrative })
  for (const point of consensusPoints) sections.push({ key: "consensus", value: point })
  for (const rec of recommendations) sections.push({ key: "recommendation", value: rec })

  const truncated = sections.map((s) => ({ ...s, value: s.value.length > MAX_SECTION ? `${s.value.slice(0, MAX_SECTION)}…` : s.value }))

  const seen = new Set<string>()
  let removedDuplicates = 0
  const deduped = truncated.filter((s) => {
    const normalized = s.value.replace(/\s+/g, " ").trim().toLowerCase()
    if (seen.has(normalized)) {
      removedDuplicates++
      return false
    }
    seen.add(normalized)
    return true
  })

  let total = 0
  const preserved: string[] = []
  const output: string[] = []
  for (const s of deduped) {
    if (total + s.value.length > MAX_TOTAL && preserved.length > 0) break
    output.push(`${s.key.toUpperCase()}:\n${s.value}`)
    preserved.push(s.key)
    total += s.value.length
  }

  const compressed = output.join("\n\n")
  const originalSize = sections.reduce((acc, s) => acc + s.value.length, 0)

  return {
    compressedContext: compressed,
    originalSize,
    compressedSize: total,
    savedBytes: Math.max(0, originalSize - total),
    removedDuplicates,
    preservedSections: preserved,
  }
})

const compressWithStrategy: Interface["compressWithStrategy"] = Effect.fn("ContextCompressor.compressWithStrategy")(function* (pkg, strategy) {
  const sections: { key: string; value: string }[] = []

  const repo = pkg.repositoryIntelligence?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary
  if (repo) sections.push({ key: "repository", value: repo })

  const arch = pkg.architectureIntelligence?.summary ?? pkg.knowledgeBundle.architectureSummary
  if (arch) sections.push({ key: "architecture", value: arch })

  const dep = pkg.dependencyIntelligence?.summary
  if (dep) sections.push({ key: "dependency", value: dep })

  const doc = pkg.documentationIntelligence?.summary
  if (doc) sections.push({ key: "documentation", value: doc })

  const ver = pkg.verificationIntelligence?.summary
  if (ver) sections.push({ key: "verification", value: ver })

  if (pkg.conversationSummary) sections.push({ key: "conversation", value: pkg.conversationSummary })

  if (pkg.knowledgeBundle.contextSummary) sections.push({ key: "context", value: pkg.knowledgeBundle.contextSummary })

  const plan = pkg.planningPolicy
    ? `Policy: max ${pkg.planningPolicy.maxSpecialists} specialists`
    : undefined
  if (plan) sections.push({ key: "planning", value: plan })

  const intel = pkg.executionIntelligence
  if (intel?.executionRisks && intel.executionRisks.length > 0) {
    sections.push({ key: "risks", value: intel.executionRisks.map((r) => `[${r.severity}] ${r.risk}`).join("; ") })
  }
  if (intel?.executionRecommendations && intel.executionRecommendations.length > 0) {
    sections.push({ key: "recommendations", value: intel.executionRecommendations.map((r) => `(${r.priority}) ${r.recommendation}`).join("; ") })
  }

  const preferred = strategy.replace("-first", "")
  const applyOrder = strategy !== "balanced" && strategy !== "long-context" && strategy !== "short-context"
  if (applyOrder) {
    const idx = sections.findIndex((s) => s.key === preferred)
    if (idx > 0) {
      const [item] = sections.splice(idx, 1)
      sections.unshift(item)
    }
  }

  const truncated = sections.map((s) => ({ ...s, value: s.value.length > MAX_SECTION ? `${s.value.slice(0, MAX_SECTION)}…` : s.value }))

  const seen = new Set<string>()
  let removedDuplicates = 0
  const deduped = truncated.filter((s) => {
    const normalized = s.value.replace(/\s+/g, " ").trim().toLowerCase()
    if (seen.has(normalized)) {
      removedDuplicates++
      return false
    }
    seen.add(normalized)
    return true
  })

  const contextMax = strategy === "short-context" ? 800 : strategy === "long-context" ? 4800 : MAX_TOTAL
  let total = 0
  const preserved: string[] = []
  const output: string[] = []
  for (const s of deduped) {
    if (total + s.value.length > contextMax && preserved.length > 0) break
    output.push(`${s.key.toUpperCase()}:\n${s.value}`)
    preserved.push(s.key)
    total += s.value.length
  }

  const compressed = output.join("\n\n")
  const originalSize = sections.reduce((acc, s) => acc + s.value.length, 0)

  return {
    compressedContext: compressed,
    originalSize,
    compressedSize: total,
    savedBytes: Math.max(0, originalSize - total),
    removedDuplicates,
    preservedSections: preserved,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ compress, compressWithStrategy, compressReasoning })
  }),
)

export { layer }
