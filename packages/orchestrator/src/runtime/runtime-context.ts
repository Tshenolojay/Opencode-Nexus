export * as RuntimeContext from "./runtime-context"

import { Context, Effect, Layer } from "effect"
import type { SpecialistContext } from "../execution/context-builder"
import type { RuntimeResult } from "./runtime-result"

export interface RuntimeContextData {
  readonly objective: string
  readonly repositorySummary: string | undefined
  readonly architectureSummary: string | undefined
  readonly relevantFiles: readonly string[]
  readonly documentation: readonly string[]
  readonly dependencyGraph: readonly string[]
  readonly conversationSummary: string | undefined
  readonly executionObjectives: readonly string[]
  readonly previousSpecialistOutputs: readonly { readonly specialistID: string; readonly summary: string }[]
}

export interface BuildInput {
  readonly specialistID: string
  readonly objective: string
  readonly base: SpecialistContext
  readonly previousResults: readonly RuntimeResult[]
}

export interface Interface {
  readonly build: (input: BuildInput) => Effect.Effect<RuntimeContextData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/RuntimeContext") {}

const build: Interface["build"] = Effect.fn("RuntimeContext.build")(function* (input) {
  const previous = input.previousResults.map((r) => ({
    specialistID: r.specialistID,
    summary: r.collectedKnowledge.map((k) => k.content).join("; ").slice(0, 500),
  }))

  return {
    objective: input.objective,
    repositorySummary: input.base.repositoryContext,
    architectureSummary: input.base.architectureContext,
    relevantFiles: input.base.relatedFiles,
    documentation: input.base.documentationContext,
    dependencyGraph: input.base.dependencyContext,
    conversationSummary: input.base.conversationContext,
    executionObjectives: [input.objective, ...input.base.existingKnowledge.slice(0, 3)],
    previousSpecialistOutputs: previous,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
