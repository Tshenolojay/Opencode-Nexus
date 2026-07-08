export * as PlanningPolicy from "./planning-policy"

import { Context, Effect, Layer } from "effect"
import type { TaskClassification, ClassificationResult } from "../classifier/schema"
import type { ConfidenceLevel } from "../types/confidence"
import type { Capability } from "../types/capability"

export type PolicyType =
  | "high-confidence"
  | "medium-confidence"
  | "low-confidence"
  | "repository-missing"
  | "documentation-required"
  | "external-search-required"
  | "verification-required"
  | "large-repository"

export interface PlanningPolicy {
  readonly policy: PolicyType
  readonly label: string
  readonly description: string
  readonly requiresSpecialists: boolean
  readonly maxSpecialists: number
  readonly requiresKnowledgeCollection: boolean
  readonly requiresExternalSearch: boolean
  readonly requiresVerification: boolean
  readonly priority: number
}

export interface PolicyInput {
  readonly classification: TaskClassification
  readonly classifications: readonly ClassificationResult[]
  readonly confidence: ConfidenceLevel
  readonly confidenceScore: number
  readonly repositorySize: number
  readonly capabilities: readonly Capability[]
}

export interface Interface {
  readonly evaluate: (input: PolicyInput) => Effect.Effect<PlanningPolicy>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PlanningPolicy") {}

const evaluate: Interface["evaluate"] = Effect.fn("PlanningPolicy.evaluate")(function* (input) {
  const { classification, confidence, confidenceScore, repositorySize, capabilities } = input

  if (confidence === "high" && confidenceScore >= 0.8) {
    return {
      policy: "high-confidence",
      label: "High Confidence",
      description: "High confidence in task handling — minimal orchestration",
      requiresSpecialists: false,
      maxSpecialists: 0,
      requiresKnowledgeCollection: false,
      requiresExternalSearch: false,
      requiresVerification: false,
      priority: 0,
    }
  }

  if (confidence === "medium" || (confidence === "high" && confidenceScore < 0.8)) {
    return {
      policy: "medium-confidence",
      label: "Medium Confidence",
      description: "Moderate confidence — select specialists as needed",
      requiresSpecialists: classification.requiresSearch || classification.requiresDependencyGraph,
      maxSpecialists: 3,
      requiresKnowledgeCollection: classification.requiresSearch || classification.requiresContext,
      requiresExternalSearch: classification.requiresSearch,
      requiresVerification: classification.requiresVerification,
      priority: 1,
    }
  }

  if (repositorySize > 5000) {
    return {
      policy: "large-repository",
      label: "Large Repository",
      description: "Repository exceeds 5000 files — repository understanding required",
      requiresSpecialists: true,
      maxSpecialists: 4,
      requiresKnowledgeCollection: true,
      requiresExternalSearch: false,
      requiresVerification: false,
      priority: 2,
    }
  }

  if (classification.requiresVerification) {
    return {
      policy: "verification-required",
      label: "Verification Required",
      description: "Task requires verification of results",
      requiresSpecialists: true,
      maxSpecialists: 4,
      requiresKnowledgeCollection: true,
      requiresExternalSearch: classification.requiresSearch,
      requiresVerification: true,
      priority: 3,
    }
  }

  if (classification.requiresSearch) {
    return {
      policy: "external-search-required",
      label: "External Search Required",
      description: "Task requires external search or codebase search",
      requiresSpecialists: true,
      maxSpecialists: 3,
      requiresKnowledgeCollection: true,
      requiresExternalSearch: true,
      requiresVerification: false,
      priority: 2,
    }
  }

  return {
    policy: "low-confidence",
    label: "Low Confidence",
    description: "Low confidence — comprehensive orchestration recommended",
    requiresSpecialists: true,
    maxSpecialists: 5,
    requiresKnowledgeCollection: true,
    requiresExternalSearch: classification.requiresSearch,
    requiresVerification: classification.requiresVerification,
    priority: 4,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ evaluate })
  }),
)

export { layer }
