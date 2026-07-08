export * as ExecutionGraph from "./execution-graph"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import type { Capability } from "../types/capability"
import type { KnowledgeType } from "./knowledge-planner"

export type GraphNodeType =
  | "specialist"
  | "capability"
  | "knowledge"
  | "model"

export type GraphNodeStatus =
  | "waiting"
  | "running"
  | "completed"
  | "failed"
  | "skipped"

export type GraphEdgeKind =
  | "depends-on"
  | "sequential"
  | "parallel"
  | "optional"
  | "feeds"

export interface GraphNode {
  readonly id: string
  readonly type: GraphNodeType
  readonly label: string
  readonly description: string
  readonly estimatedCost: number
  readonly estimatedDurationMs: number
  readonly status: GraphNodeStatus
  readonly assignedSpecialist: string | undefined
  readonly startedAt: number | undefined
  readonly completedAt: number | undefined
  readonly error: string | undefined
}

export interface GraphEdge {
  readonly from: string
  readonly to: string
  readonly kind: GraphEdgeKind
}

export interface Graph {
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly totalEstimatedCost: number
  readonly totalEstimatedDurationMs: number
  readonly criticalPath: readonly string[]
  readonly runtimeStatus: Readonly<Record<string, GraphNodeStatus>>
}

export interface BuildInput {
  readonly specialists: readonly SpecialistProfile[]
  readonly capabilities: readonly Capability[]
  readonly knowledgeRequests: readonly { id: string; knowledgeType: KnowledgeType }[]
  readonly specialistDependencies: readonly { from: string; to: string }[]
}

export interface Interface {
  readonly build: (input: BuildInput) => Effect.Effect<Graph>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionGraph") {}

const build: Interface["build"] = Effect.fn("ExecutionGraph.build")(function* (input) {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  for (const specialist of input.specialists) {
    nodes.push({
      id: specialist.id,
      type: "specialist",
      label: specialist.name,
      description: specialist.purpose,
      estimatedCost: 0.02,
      estimatedDurationMs: specialist.executionPriority * 1000,
      status: "waiting",
      assignedSpecialist: specialist.id,
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
    })
  }

  for (const cap of input.capabilities) {
    nodes.push({
      id: `cap-${cap}`,
      type: "capability",
      label: `Capability: ${cap}`,
      description: `Requires ${cap} capability`,
      estimatedCost: 0,
      estimatedDurationMs: 0,
      status: "waiting",
      assignedSpecialist: undefined,
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
    })
  }

  for (const kr of input.knowledgeRequests) {
    nodes.push({
      id: kr.id,
      type: "knowledge",
      label: `Knowledge: ${kr.knowledgeType}`,
      description: `Collect ${kr.knowledgeType}`,
      estimatedCost: 0.01,
      estimatedDurationMs: 1500,
      status: "waiting",
      assignedSpecialist: undefined,
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
    })
  }

  for (const dep of input.specialistDependencies) {
    edges.push({
      from: dep.from,
      to: dep.to,
      kind: "depends-on",
    })
  }

  for (const node of nodes) {
    if (node.type === "knowledge") {
      const assigned = input.specialists.find(
        (s) => node.id.includes(s.id.replace("specialist/", "").split("/").pop() ?? ""),
      )
      if (assigned) {
        edges.push({
          from: assigned.id,
          to: node.id,
          kind: "feeds",
        })
      }
    }
  }

  const totalCost = nodes.reduce((acc, n) => acc + n.estimatedCost, 0)
  const totalDuration = nodes.reduce((acc, n) => acc + n.estimatedDurationMs, 0)

  const criticalPath = nodes
    .filter((n) => n.type === "specialist")
    .sort((a, b) => b.estimatedDurationMs - a.estimatedDurationMs)
    .map((n) => n.id)

  const runtimeStatus: Record<string, GraphNodeStatus> = {}
  for (const node of nodes) {
    runtimeStatus[node.id] = node.status
  }

  return {
    nodes,
    edges,
    totalEstimatedCost: totalCost,
    totalEstimatedDurationMs: totalDuration,
    criticalPath,
    runtimeStatus,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
