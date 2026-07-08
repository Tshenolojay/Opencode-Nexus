import { Schema } from "effect"

export const Capability = Schema.Literals([
  "search",
  "reasoning",
  "long-context",
  "fast-response",
  "cheap",
  "large-output",
  "repository-understanding",
  "streaming",
  "tool-use",
  "code-generation",
  "planning",
  "analysis",
  "architecture-analysis",
  "documentation-analysis",
  "dependency-analysis",
  "verification",
  "research",
  "synthesis",
])
export type Capability = typeof Capability.Type

export interface CapabilityRequirement {
  readonly capability: Capability
  readonly weight: number
  readonly optional: boolean
}

export interface CapabilityProfile {
  readonly requirements: readonly CapabilityRequirement[]
  readonly recommendedCount: number
  readonly reason: string
}
