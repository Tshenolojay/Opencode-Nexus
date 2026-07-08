export * as AgentContext from "./agent-context"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"

export type AgentType = "build" | "plan" | "explore" | "general"

export interface AgentContextProfile {
  readonly agentType: AgentType
  readonly prioritySections: readonly string[]
  readonly suppressedSections: readonly string[]
  readonly emphasis: Readonly<Record<string, number>>
}

const buildProfile: AgentContextProfile = {
  agentType: "build",
  prioritySections: ["repositoryIntelligence", "dependencyIntelligence", "architectureIntelligence", "verificationIntelligence"],
  suppressedSections: [],
  emphasis: { repositoryIntelligence: 1.0, dependencyIntelligence: 0.9, architectureIntelligence: 0.8, verificationIntelligence: 0.7 },
}

const planProfile: AgentContextProfile = {
  agentType: "plan",
  prioritySections: ["architectureIntelligence", "planningPolicy", "dependencyIntelligence", "documentationIntelligence"],
  suppressedSections: [],
  emphasis: { architectureIntelligence: 1.0, planningPolicy: 0.9, dependencyIntelligence: 0.7, documentationIntelligence: 0.6 },
}

const exploreProfile: AgentContextProfile = {
  agentType: "explore",
  prioritySections: ["repositoryIntelligence", "dependencyIntelligence", "documentationIntelligence", "contextIntelligence"],
  suppressedSections: ["verificationIntelligence"],
  emphasis: { repositoryIntelligence: 1.0, dependencyIntelligence: 0.7, documentationIntelligence: 0.7, contextIntelligence: 0.6 },
}

const generalProfile: AgentContextProfile = {
  agentType: "general",
  prioritySections: ["conversationSummary", "knowledgeBundle", "documentationIntelligence"],
  suppressedSections: [],
  emphasis: { conversationSummary: 1.0, knowledgeBundle: 0.9, documentationIntelligence: 0.5 },
}

const profiles: Record<AgentType, AgentContextProfile> = {
  build: buildProfile,
  plan: planProfile,
  explore: exploreProfile,
  general: generalProfile,
}

export function getProfile(agentType: AgentType): AgentContextProfile {
  return profiles[agentType] ?? generalProfile
}

export function detectAgentType(taskType: string): AgentType {
  switch (taskType) {
    case "code-generation":
    case "code-review":
    case "test":
    case "debug":
    case "refactor":
      return "build"
    case "architecture":
    case "planning":
      return "plan"
    case "code-search":
    case "research":
      return "explore"
    default:
      return "general"
  }
}

export interface Interface {
  readonly prepare: (pkg: ExecutionPackage) => Effect.Effect<AgentContextProfile>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/AgentContext") {}

const prepare: Interface["prepare"] = Effect.fn("AgentContext.prepare")(function* (pkg) {
  const agentType = detectAgentType(pkg.taskClassification.type)
  return getProfile(agentType)
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ prepare })
  }),
)

export { layer }
