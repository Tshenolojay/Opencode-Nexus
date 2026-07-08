export * as CapabilityPlanner from "./capability-planner"

import { Context, Effect, Layer } from "effect"
import type { TaskClassification, ClassificationResult } from "../classifier/schema"
import type { Capability, CapabilityRequirement } from "../types/capability"
import type { ConfidenceLevel } from "../types/confidence"

export interface CapabilityPlan {
  readonly requirements: readonly CapabilityRequirement[]
  readonly recommendedCount: number
  readonly required: readonly Capability[]
  readonly reason: string
  readonly highPriority: readonly Capability[]
  readonly mediumPriority: readonly Capability[]
  readonly lowPriority: readonly Capability[]
}

export interface PlannerInput {
  readonly taskClassification: TaskClassification
  readonly classifications: readonly ClassificationResult[]
  readonly confidence: ConfidenceLevel
  readonly confidenceScore: number
  readonly repositorySize: number
  readonly conversationLength: number
  readonly sessionMetadata: Record<string, string> | undefined
}

export interface Interface {
  readonly plan: (input: PlannerInput) => Effect.Effect<CapabilityPlan>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CapabilityPlanner") {}

const plan: Interface["plan"] = Effect.fn("CapabilityPlanner.plan")(function* (input) {
  const { taskClassification, classifications, confidence, confidenceScore } = input
  const requirements: CapabilityRequirement[] = []

  const add = (capability: Capability, weight: number, optional: boolean) => {
    const existing = requirements.find((r) => r.capability === capability)
    if (existing) {
      existing.weight = Math.max(existing.weight, weight)
      if (!optional) existing.optional = false
    } else {
      requirements.push({ capability, weight, optional })
    }
  }

  add("reasoning", 0.7, false)

  if (taskClassification.requiresSearch) {
    add("search", 0.9, false)
    add("repository-understanding", 0.7, false)
  }

  if (taskClassification.requiresContext) {
    add("long-context", 0.8, false)
    add("repository-understanding", 0.6, false)
  }

  if (taskClassification.requiresDependencyGraph) {
    add("search", 0.8, false)
    add("analysis", 0.7, false)
  }

  if (taskClassification.requiresVerification) {
    add("analysis", 0.8, false)
    add("verification", 0.9, false)
    add("tool-use", 0.6, false)
    add("code-generation", 0.5, true)
  }

  const typeHints: Record<string, { capability: Capability; weight: number }[]> = {
    "code-generation": [
      { capability: "code-generation", weight: 1.0 },
      { capability: "tool-use", weight: 0.8 },
      { capability: "reasoning", weight: 0.7 },
    ],
    "code-review": [
      { capability: "analysis", weight: 1.0 },
      { capability: "reasoning", weight: 0.9 },
      { capability: "code-generation", weight: 0.4 },
    ],
    "code-search": [
      { capability: "search", weight: 1.0 },
      { capability: "repository-understanding", weight: 0.8 },
    ],
    debug: [
      { capability: "analysis", weight: 1.0 },
      { capability: "reasoning", weight: 0.9 },
      { capability: "tool-use", weight: 0.7 },
    ],
    test: [
      { capability: "code-generation", weight: 1.0 },
      { capability: "analysis", weight: 0.8 },
      { capability: "tool-use", weight: 0.7 },
    ],
    architecture: [
      { capability: "analysis", weight: 1.0 },
      { capability: "reasoning", weight: 0.9 },
      { capability: "planning", weight: 0.8 },
    ],
    planning: [
      { capability: "planning", weight: 1.0 },
      { capability: "reasoning", weight: 0.9 },
      { capability: "analysis", weight: 0.7 },
    ],
    "architecture-design": [
      { capability: "architecture-analysis", weight: 1.0 },
      { capability: "reasoning", weight: 0.9 },
      { capability: "analysis", weight: 0.8 },
    ],
    research: [
      { capability: "research", weight: 1.0 },
      { capability: "search", weight: 0.9 },
      { capability: "synthesis", weight: 0.8 },
      { capability: "analysis", weight: 0.7 },
    ],
    documentation: [
      { capability: "documentation-analysis", weight: 1.0 },
      { capability: "long-context", weight: 0.8 },
      { capability: "research", weight: 0.6 },
    ],
    "dependency-management": [
      { capability: "dependency-analysis", weight: 1.0 },
      { capability: "search", weight: 0.8 },
      { capability: "analysis", weight: 0.7 },
    ],
  }

  const hints = typeHints[taskClassification.type]
  if (hints) {
    for (const hint of hints) {
      add(hint.capability, hint.weight, false)
    }
  }

  for (const c of classifications) {
    const typeHints2 = typeHints[c.type]
    if (typeHints2 && c.confidence > 0.5) {
      for (const hint of typeHints2) {
        add(hint.capability, hint.weight * c.confidence, true)
      }
    }
  }

  if (input.repositorySize > 1000) {
    add("repository-understanding", 0.6, true)
    add("search", 0.5, true)
  }

  if (input.conversationLength > 20) {
    add("long-context", 0.7, true)
  }

  if (confidence === "low" || confidenceScore < 0.4) {
    add("planning", 0.9, false)
    add("reasoning", 1.0, false)
  }

  const sorted = [...requirements].sort((a, b) => b.weight - a.weight)

  const required = sorted.filter((r) => !r.optional).map((r) => r.capability)
  const high = sorted.filter((r) => r.weight >= 0.8).map((r) => r.capability)
  const medium = sorted.filter((r) => r.weight >= 0.5 && r.weight < 0.8).map((r) => r.capability)
  const low = sorted.filter((r) => r.weight < 0.5).map((r) => r.capability)

  return {
    requirements: sorted,
    recommendedCount: sorted.length,
    required: [...new Set(required)],
    reason: `Capability plan for ${taskClassification.type} (confidence: ${confidence}, score: ${confidenceScore})`,
    highPriority: [...new Set(high)],
    mediumPriority: [...new Set(medium)],
    lowPriority: [...new Set(low)],
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ plan })
  }),
)

export { layer }
