export * as AgentCapabilities from "./agent-capabilities"

import { Context, Effect, Layer } from "effect"
import type { Capability } from "../types/capability"
import type { AgentType } from "./agent-context"

export interface AgentCapabilityMapping {
  readonly agentType: AgentType
  readonly matchedCapabilities: readonly Capability[]
  readonly coverageScore: number
}

const agentCapabilityMap: Record<AgentType, readonly Capability[]> = {
  build: ["code-generation", "tool-use", "analysis", "verification", "reasoning", "repository-understanding"],
  plan: ["planning", "reasoning", "analysis", "architecture-analysis", "documentation-analysis", "synthesis"],
  explore: ["search", "research", "repository-understanding", "dependency-analysis", "long-context", "analysis"],
  general: ["reasoning", "long-context", "synthesis", "research", "analysis"],
}

export function getCapabilitiesForAgent(agentType: AgentType): readonly Capability[] {
  return agentCapabilityMap[agentType] ?? agentCapabilityMap.general
}

export function matchAgent(capabilities: readonly Capability[]): AgentCapabilityMapping[] {
  const results: AgentCapabilityMapping[] = []

  for (const [agentType, agentCaps] of Object.entries(agentCapabilityMap)) {
    const matched = capabilities.filter((c) => agentCaps.includes(c as Capability))
    const score = capabilities.length > 0 ? matched.length / capabilities.length : 0

    results.push({
      agentType: agentType as AgentType,
      matchedCapabilities: matched,
      coverageScore: score,
    })
  }

  results.sort((a, b) => b.coverageScore - a.coverageScore)
  return results
}

export interface Interface {
  readonly resolve: (capabilities: readonly Capability[]) => Effect.Effect<readonly AgentCapabilityMapping[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/AgentCapabilities") {}

const resolve: Interface["resolve"] = Effect.fn("AgentCapabilities.resolve")(function* (capabilities) {
  return matchAgent(capabilities)
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ resolve })
  }),
)

export { layer }
