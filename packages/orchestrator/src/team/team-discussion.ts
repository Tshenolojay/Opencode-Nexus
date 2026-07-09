export * as TeamDiscussionEngine from "./team-discussion"

import { Context, Effect, Layer } from "effect"
import type { VirtualTeam, WorkspaceSummaries, TeamDiscussion } from "../integration/execution-package"

export interface Interface {
  readonly build: (team: VirtualTeam, workspaces: WorkspaceSummaries) => Effect.Effect<TeamDiscussion>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/TeamDiscussionEngine") {}

const build: Interface["build"] = Effect.fn("TeamDiscussionEngine.build")(function* (team, workspaces) {
  const agreements = team.activeParticipants.flatMap((id) => {
    const summary = workspaces.summaries[id]
    return summary && summary.includes("relevant files found") ? [`${id} confirms feasibility assessment`] : []
  })

  const confidenceValues = team.members.filter((m) => team.activeParticipants.includes(m.specialistID)).map((m) => m.confidence)
  const avgConfidence = confidenceValues.reduce((a, b) => a + b, 0) / (confidenceValues.length || 1)
  const disagreements = confidenceValues.some((c) => Math.abs(c - avgConfidence) > 0.3)
    ? ["Confidence variance above threshold across team members"]
    : []

  const missingEvidence = team.activeParticipants.length < 3
    ? ["Limited specialist coverage – additional perspectives may be needed"]
    : []

  const unresolvedQuestions = workspaces.summaries
    ? [`Review workspace summaries for ${team.activeParticipants.length} active specialists`]
    : []

  const confidenceDifferences = confidenceValues.map(
    (c, i) => `${team.activeParticipants[i] ?? "unknown"}: confidence ${(c * 100).toFixed(0)}%`,
  )

  const recommendations = team.activeParticipants.map((id) => `Proceed with ${id} task assignments`)

  return {
    agreements,
    disagreements,
    missingEvidence,
    unresolvedQuestions,
    confidenceDifferences,
    recommendations,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
