export * as TeamWorkspace from "./workspace"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { KnowledgeSourceType, VirtualTeam, WorkspaceSummaries } from "../integration/execution-package"
import { DefaultSpecialists } from "../specialists/profiles"

export interface Interface {
  readonly buildWorkspaces: (team: VirtualTeam, pkg: ExecutionPackage) => Effect.Effect<WorkspaceSummaries>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/TeamWorkspace") {}

const buildWorkspaces: Interface["buildWorkspaces"] = Effect.fn("TeamWorkspace.buildWorkspaces")(function* (team, pkg) {
  const summaries: Record<string, string> = {}

  for (const member of team.activeParticipants) {
    const profile = DefaultSpecialists.find((s) => s.id === member)
    if (!profile) continue
    const relevantFiles = pkg.knowledgeBundle.relevantFiles.filter((f) => profile.preferredKnowledge.some((k) => f.includes(k) || k.includes("all")))
    const summary = [
      `Specialist: ${profile.name}`,
      `Purpose: ${profile.purpose}`,
      `Relevant files found: ${relevantFiles.length}`,
      relevantFiles.length > 0 ? `Key files: ${relevantFiles.slice(0, 3).join(", ")}` : null,
      `Available capabilities: ${profile.requiredCapabilities.join(", ")}`,
      `Knowledge areas: ${profile.preferredKnowledge.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n")
    summaries[member] = summary
  }

  return {
    summaries,
    requestedSources: pkg.connectorPlan?.requests?.map((r) => r.sourceType) ?? undefined,
    receivedSources: pkg.knowledgeSources?.map((s) => s.type) ?? undefined,
    missingSources: pkg.connectorPlan?.requests?.filter((r) => !pkg.knowledgeSources?.some((s) => s.type === r.sourceType)).map((r) => r.sourceType) ?? undefined,
    reusableSources: pkg.reusableKnowledgeSources,
    connectorConfidence: pkg.connectorPlan?.requests && pkg.knowledgeSources
      ? pkg.knowledgeSources.filter((s) => s.confidence >= 0.7).length / pkg.connectorPlan.requests.length
      : undefined,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ buildWorkspaces })
  }),
)

export { layer }
