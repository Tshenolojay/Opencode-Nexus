export * as CapabilityRegistry from "./capability-registry"

import { Context, Effect, Layer } from "effect"
import { Capability } from "../types/capability"
import type { Capability as CapabilityType } from "../types/capability"

export interface CapabilityMeta {
  readonly capability: CapabilityType
  readonly displayName: string
  readonly description: string
  readonly category: "reasoning" | "context" | "specialized" | "execution" | "analysis" | "cost"
  readonly aliases: readonly string[]
}

export const ALL_CAPABILITIES: readonly CapabilityMeta[] = [
  { capability: "search", displayName: "Search", description: "Ability to search code and resources", category: "specialized", aliases: ["code-search", "resource-search"] },
  { capability: "reasoning", displayName: "Reasoning", description: "Strong logical reasoning and problem-solving", category: "reasoning", aliases: ["logical-reasoning", "deep-thinking"] },
  { capability: "long-context", displayName: "Long Context", description: "Ability to handle large context windows", category: "context", aliases: ["large-context", "extended-context"] },
  { capability: "fast-response", displayName: "Fast Response", description: "Low latency response time", category: "execution", aliases: ["quick-response", "low-latency"] },
  { capability: "cheap", displayName: "Cheap", description: "Low cost per token", category: "cost", aliases: ["low-cost", "economical"] },
  { capability: "large-output", displayName: "Large Output", description: "Ability to generate large outputs", category: "execution", aliases: ["long-output", "high-throughput"] },
  { capability: "repository-understanding", displayName: "Repository Understanding", description: "Understanding of code repository structure", category: "specialized", aliases: ["repo-understanding", "codebase-understanding"] },
  { capability: "streaming", displayName: "Streaming", description: "Supports streaming output", category: "execution", aliases: ["stream", "real-time"] },
  { capability: "tool-use", displayName: "Tool Use", description: "Ability to use external tools and functions", category: "execution", aliases: ["function-calling", "tool-calling"] },
  { capability: "code-generation", displayName: "Code Generation", description: "Ability to generate code", category: "specialized", aliases: ["code-gen", "code-writing"] },
  { capability: "planning", displayName: "Planning", description: "Ability to create and follow plans", category: "reasoning", aliases: ["task-planning", "execution-planning"] },
  { capability: "analysis", displayName: "Analysis", description: "Ability to analyze code and data", category: "analysis", aliases: ["code-analysis", "data-analysis"] },
  { capability: "architecture-analysis", displayName: "Architecture Analysis", description: "Ability to analyze software architecture", category: "analysis", aliases: ["arch-analysis", "design-analysis"] },
  { capability: "documentation-analysis", displayName: "Documentation Analysis", description: "Ability to analyze documentation", category: "analysis", aliases: ["docs-analysis", "doc-understanding"] },
  { capability: "dependency-analysis", displayName: "Dependency Analysis", description: "Ability to analyze dependencies", category: "analysis", aliases: ["dep-analysis", "dependency-resolution"] },
  { capability: "verification", displayName: "Verification", description: "Ability to verify correctness", category: "specialized", aliases: ["validation", "checking"] },
  { capability: "research", displayName: "Research", description: "Ability to research and gather information", category: "specialized", aliases: ["investigation", "information-gathering"] },
  { capability: "synthesis", displayName: "Synthesis", description: "Ability to synthesize information from multiple sources", category: "reasoning", aliases: ["information-synthesis", "merge"] },
]

const CAPABILITY_BY_NAME = new Map<string, CapabilityMeta>(ALL_CAPABILITIES.map((c) => [c.capability, c]))

const CAPABILITY_BY_ALIAS = new Map<string, CapabilityMeta>(
  ALL_CAPABILITIES.flatMap((c) => c.aliases.map((a) => [a, c] as const)),
)

const CAPABILITIES_BY_CATEGORY = new Map<string, CapabilityMeta[]>()
for (const meta of ALL_CAPABILITIES) {
  const group = CAPABILITIES_BY_CATEGORY.get(meta.category) ?? []
  group.push(meta)
  CAPABILITIES_BY_CATEGORY.set(meta.category, group)
}

export interface Interface {
  readonly getMeta: (capability: CapabilityType) => CapabilityMeta | undefined
  readonly findByAlias: (alias: string) => CapabilityType | undefined
  readonly findByCategory: (category: CapabilityMeta["category"]) => readonly CapabilityType[]
  readonly all: () => readonly CapabilityMeta[]
  readonly resolve: (name: string) => CapabilityType | undefined
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CapabilityRegistry") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({
      getMeta: (capability) => CAPABILITY_BY_NAME.get(capability),
      findByAlias: (alias) => CAPABILITY_BY_ALIAS.get(alias)?.capability,
      findByCategory: (category) => (CAPABILITIES_BY_CATEGORY.get(category) ?? []).map((m) => m.capability),
      all: () => ALL_CAPABILITIES,
      resolve: (name) => CAPABILITY_BY_NAME.get(name)?.capability ?? CAPABILITY_BY_ALIAS.get(name)?.capability,
    })
  }),
)

export { layer }
