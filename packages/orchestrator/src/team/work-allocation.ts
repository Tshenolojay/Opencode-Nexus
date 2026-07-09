export * as WorkAllocationEngine from "./work-allocation"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { TaskGraph, VirtualTeam, WorkAssignments, WorkAssignment, SpecialistOwnership } from "../integration/execution-package"
import { DefaultSpecialists } from "../specialists/profiles"

export interface Interface {
  readonly allocate: (graph: TaskGraph, team: VirtualTeam, pkg: ExecutionPackage) => Effect.Effect<WorkAssignments>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/WorkAllocationEngine") {}

const allocate: Interface["allocate"] = Effect.fn("WorkAllocationEngine.allocate")(function* (graph, team, pkg) {
  const assignments: WorkAssignment[] = []
  const ownershipMap = new Map<string, string[]>()

  for (const unit of graph.units) {
    const candidates = team.members.filter((m) => m.active && unit.requiredCapabilities.some((c) => m.capabilities.includes(c)))
    if (candidates.length === 0) continue
    candidates.sort((a, b) => b.confidence - a.confidence || a.priority - b.priority)
    const chosen = candidates[0]
    const rationale = `Matched ${unit.requiredCapabilities.join(", ")} to ${chosen.name}`
    assignments.push({ taskID: unit.id, specialistID: chosen.specialistID, executionPriority: chosen.priority, rationale })
    ownershipMap.set(chosen.specialistID, [...(ownershipMap.get(chosen.specialistID) ?? []), unit.id])
  }

  const ownership: SpecialistOwnership[] = Array.from(ownershipMap.entries()).map(([specialistID, taskIDs]) => ({
    specialistID,
    taskIDs,
    confidence: team.members.find((m) => m.specialistID === specialistID)?.confidence ?? 0.5,
  }))

  const priority: WorkAssignments["priority"] = pkg.confidence === "low" ? "high" : pkg.taskClassification.complexity > 5 ? "medium" : "low"

  return { assignments, ownership, priority }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ allocate })
  }),
)

export { layer }
