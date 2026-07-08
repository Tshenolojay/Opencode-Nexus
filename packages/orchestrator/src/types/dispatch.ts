import { Schema } from "effect"

export const AgentRole = Schema.Literals([
  "search",
  "context",
  "dependency",
  "verification",
])
export type AgentRole = typeof AgentRole.Type

export interface AgentSpec {
  readonly role: AgentRole
  readonly priority: number
  readonly dependsOn: readonly AgentRole[]
  readonly estimatedCost: number
  readonly estimatedDurationMs: number
  readonly requiredCapabilities: readonly string[]
}

export interface AgentDependency {
  readonly from: AgentRole
  readonly to: AgentRole
  readonly kind: "blocks" | "feeds"
}

export interface ParallelGroup {
  readonly agents: readonly AgentRole[]
  readonly description: string
}

export interface ExecutionStage {
  readonly stageID: string
  readonly agents: readonly AgentRole[]
  readonly dependsOn: readonly string[]
  readonly parallel: boolean
  readonly knowledgeTargets: readonly string[]
}

export interface ExecutionGraph {
  readonly stages: readonly ExecutionStage[]
  readonly parallelGroups: readonly ParallelGroup[]
  readonly dependencies: readonly AgentDependency[]
  readonly totalStages: number
}
