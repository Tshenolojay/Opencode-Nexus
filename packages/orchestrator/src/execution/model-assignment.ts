export * as ModelAssignment from "./model-assignment"

import { Context, Effect, Layer } from "effect"
import { ModelSelector } from "../selector/selector"
import type { Capability } from "../types/capability"
import type { ModelCandidate } from "./specialist-result"

export interface AssignmentResult {
  readonly primary: ModelCandidate | undefined
  readonly backup: ModelCandidate | undefined
  readonly selectionConfidence: number
}

export interface AssignmentInput {
  readonly specialistCapabilities: readonly string[]
  readonly taskComplexity: number
}

export interface Interface {
  readonly assign: (input: AssignmentInput) => Effect.Effect<AssignmentResult>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ModelAssignment") {}

const assign: Interface["assign"] = Effect.fn("ModelAssignment.assign")(function* (input) {
  const selector = yield* ModelSelector.Service

  const required = input.specialistCapabilities.filter((c) => true) as Capability[]

  const synthetic = [
    { providerID: "default", modelID: "capability-match", capabilities: required, priority: 1 },
    { providerID: "default", modelID: "general", capabilities: [] as Capability[], priority: 0 },
  ]

  const evaluation = yield* selector.evaluate({
    requiredCapabilities: required,
    availableModels: synthetic,
  })

  const toCandidate = (s: typeof evaluation.candidates[number] | undefined): ModelCandidate | undefined => {
    if (!s) return undefined
    return {
      providerID: s.providerID,
      modelID: s.modelID,
      matchScore: s.matchScore,
      matchedCapabilities: s.matchedCapabilities,
      missingCapabilities: s.missingCapabilities,
    }
  }

  const primary = toCandidate(evaluation.candidates[0])
  const backup = toCandidate(evaluation.candidates[1])

  const selectionConfidence = evaluation.candidates.length > 0
    ? evaluation.candidates[0].matchScore
    : 0

  return { primary, backup, selectionConfidence }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ assign })
  }),
)

export { layer }
