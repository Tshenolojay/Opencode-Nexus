export * as KnowledgePlanner from "./knowledge-planner"

import { Context, Effect, Layer } from "effect"
import type { TaskType } from "../types/classification"
import type { Capability } from "../types/capability"

export type KnowledgeType =
  | "repository-summary"
  | "architecture-summary"
  | "relevant-files"
  | "dependency-graph"
  | "documentation"
  | "configuration"
  | "project-structure"
  | "conversation-summary"
  | "tool-history"
  | "search-results"
  | "external-references"
  | "verification-targets"

export interface KnowledgeRequest {
  readonly id: string
  readonly knowledgeType: KnowledgeType
  readonly priority: number
  readonly assignedSpecialist: string | undefined
  readonly status: "pending" | "in-progress" | "completed" | "failed"
  readonly description: string
  readonly dependsOn: readonly string[]
}

export interface KnowledgePlan {
  readonly requests: readonly KnowledgeRequest[]
  readonly parallelGroups: readonly KnowledgeType[][]
  readonly estimatedTotalCost: number
  readonly estimatedDurationMs: number
}

export interface PlannerInput {
  readonly taskType: TaskType
  readonly requiredCapabilities: readonly Capability[]
  readonly requiresSearch: boolean
  readonly requiresContext: boolean
  readonly requiresDependencyGraph: boolean
  readonly requiresVerification: boolean
  readonly predictedSpecialists: readonly string[]
}

export interface Interface {
  readonly plan: (input: PlannerInput) => Effect.Effect<KnowledgePlan>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgePlanner") {}

let requestCounter = 0

function nextID(): string {
  requestCounter++
  return `req-${requestCounter}`
}

const plan: Interface["plan"] = Effect.fn("KnowledgePlanner.plan")(function* (input) {
  const requests: KnowledgeRequest[] = []
  const groups: KnowledgeType[][] = []

  if (input.requiresSearch || input.requiredCapabilities.includes("search")) {
    const searchReq: KnowledgeRequest = {
      id: nextID(),
      knowledgeType: "search-results",
      priority: 1,
      assignedSpecialist: input.predictedSpecialists.includes("specialist/search")
        ? "specialist/search"
        : undefined,
      status: "pending",
      description: "Search for relevant code and patterns",
      dependsOn: [],
    }
    requests.push(searchReq)

    const filesReq: KnowledgeRequest = {
      id: nextID(),
      knowledgeType: "relevant-files",
      priority: 1,
      assignedSpecialist: input.predictedSpecialists.includes("specialist/search")
        ? "specialist/search"
        : undefined,
      status: "pending",
      description: "Identify relevant files for the task",
      dependsOn: [searchReq.id],
    }
    requests.push(filesReq)

    groups.push(["search-results", "relevant-files"])
  }

  if (input.requiresContext) {
    const repoReq: KnowledgeRequest = {
      id: nextID(),
      knowledgeType: "repository-summary",
      priority: 2,
      assignedSpecialist: input.predictedSpecialists.includes("specialist/repository")
        ? "specialist/repository"
        : input.predictedSpecialists.includes("specialist/architecture")
          ? "specialist/architecture"
          : undefined,
      status: "pending",
      description: "Summarize repository structure",
      dependsOn: [],
    }
    requests.push(repoReq)

    const archReq: KnowledgeRequest = {
      id: nextID(),
      knowledgeType: "architecture-summary",
      priority: 2,
      assignedSpecialist: input.predictedSpecialists.includes("specialist/architecture")
        ? "specialist/architecture"
        : undefined,
      status: "pending",
      description: "Summarize system architecture",
      dependsOn: [repoReq.id],
    }
    requests.push(archReq)

    groups.push(["repository-summary"])
    groups.push(["architecture-summary"])
  }

  if (input.requiresDependencyGraph) {
    const depReq: KnowledgeRequest = {
      id: nextID(),
      knowledgeType: "dependency-graph",
      priority: 3,
      assignedSpecialist: input.predictedSpecialists.includes("specialist/dependency")
        ? "specialist/dependency"
        : undefined,
      status: "pending",
      description: "Analyze project dependencies",
      dependsOn: [],
    }
    requests.push(depReq)

    groups.push(["dependency-graph"])
  }

  if (input.requiresVerification) {
    const verifyReq: KnowledgeRequest = {
      id: nextID(),
      knowledgeType: "verification-targets",
      priority: 5,
      assignedSpecialist: input.predictedSpecialists.includes("specialist/verification")
        ? "specialist/verification"
        : undefined,
      status: "pending",
      description: "Determine verification targets and criteria",
      dependsOn: [],
    }
    requests.push(verifyReq)

    groups.push(["verification-targets"])
  }

  const docReq: KnowledgeRequest = {
    id: nextID(),
    knowledgeType: "documentation",
    priority: 4,
    assignedSpecialist: input.predictedSpecialists.includes("specialist/documentation")
      ? "specialist/documentation"
      : undefined,
    status: "pending",
    description: "Gather relevant documentation",
    dependsOn: [],
  }
  requests.push(docReq)
  groups.push(["documentation"])

  const estimatedCost = requests.length * 0.01
  const estimatedDurationMs = groups.length * 2000 + requests.length * 500

  return {
    requests,
    parallelGroups: groups,
    estimatedTotalCost: estimatedCost,
    estimatedDurationMs,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ plan })
  }),
)

export { layer }
