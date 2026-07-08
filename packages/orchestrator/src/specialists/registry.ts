export * as SpecialistRegistry from "./registry"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "./profiles"
import { DefaultSpecialists } from "./profiles"
import type { TaskType } from "../types/classification"
import type { Capability } from "../types/capability"
import type { ConfidenceLevel } from "../types/confidence"

export interface SpecialistMatch {
  readonly specialist: SpecialistProfile
  readonly matchScore: number
  readonly matchedCapabilities: readonly Capability[]
}

export interface FilterOptions {
  readonly taskTypes: readonly TaskType[] | undefined
  readonly requiredCapabilities: readonly Capability[] | undefined
  readonly minConfidence: ConfidenceLevel | undefined
  readonly maxSpecialists: number | undefined
}

export interface Interface {
  readonly register: (profile: SpecialistProfile) => Effect.Effect<void>
  readonly getAll: () => Effect.Effect<readonly SpecialistProfile[]>
  readonly getByID: (id: string) => Effect.Effect<SpecialistProfile | undefined>
  readonly filterByCapabilities: (capabilities: readonly Capability[], options?: FilterOptions) => Effect.Effect<readonly SpecialistMatch[]>
  readonly filterByTaskType: (taskType: TaskType, options?: FilterOptions) => Effect.Effect<readonly SpecialistMatch[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/SpecialistRegistry") {}

function scoreSpecialist(specialist: SpecialistProfile, capabilities: readonly Capability[]): SpecialistMatch | undefined {
  if (specialist.requiredCapabilities.length === 0) return undefined

  const matched: Capability[] = []
  for (const cap of capabilities) {
    if (specialist.requiredCapabilities.includes(cap)) {
      matched.push(cap)
    }
  }

  if (matched.length === 0) return undefined

  return {
    specialist,
    matchScore: matched.length / specialist.requiredCapabilities.length,
    matchedCapabilities: matched,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const registered: SpecialistProfile[] = [...DefaultSpecialists]

    const register = Effect.fn("SpecialistRegistry.register")(function* (profile: SpecialistProfile) {
      const existing = registered.findIndex((r) => r.id === profile.id)
      if (existing >= 0) {
        registered[existing] = profile
      } else {
        registered.push(profile)
      }
    })

    const getAll = Effect.sync(() => registered as readonly SpecialistProfile[])

    const getByID = Effect.fn("SpecialistRegistry.getByID")(function* (id: string) {
      return registered.find((r) => r.id === id)
    })

    const filterByCapabilities = Effect.fn("SpecialistRegistry.filterByCapabilities")(function* (
      capabilities: readonly Capability[],
      options?: FilterOptions,
    ) {
      const max = options?.maxSpecialists ?? capabilities.length
      const results: SpecialistMatch[] = []

      for (const specialist of registered) {
        const match = scoreSpecialist(specialist, capabilities)
        if (match) results.push(match)
      }

      results.sort((a, b) => b.matchScore - a.matchScore)

      return results.slice(0, max)
    })

    const filterByTaskType = Effect.fn("SpecialistRegistry.filterByTaskType")(function* (
      taskType: TaskType,
      options?: FilterOptions,
    ) {
      const mappedCapabilities = taskTypeToCapabilities(taskType)
      return yield* filterByCapabilities(mappedCapabilities, options)
    })

    return Service.of({ register, getAll, getByID, filterByCapabilities, filterByTaskType })
  }),
)

export { layer }

function taskTypeToCapabilities(taskType: TaskType): Capability[] {
  const map: Partial<Record<TaskType, Capability[]>> = {
    "code-generation": ["code-generation", "tool-use", "reasoning"],
    "code-review": ["analysis", "reasoning"],
    "code-search": ["search", "repository-understanding"],
    debug: ["analysis", "reasoning", "tool-use"],
    test: ["code-generation", "analysis", "tool-use"],
    refactor: ["code-generation", "reasoning", "repository-understanding"],
    "dependency-management": ["search", "analysis"],
    architecture: ["analysis", "reasoning", "planning"],
    research: ["search", "analysis", "reasoning"],
    planning: ["planning", "reasoning", "analysis"],
  }
  return map[taskType] ?? ["reasoning"]
}
