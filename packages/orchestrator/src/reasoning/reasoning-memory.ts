export * as ReasoningMemory from "./reasoning-memory"

import { Context, Effect, Layer, Ref } from "effect"

export interface ReasoningMemoryData {
  readonly sessionID: string
  readonly previousReasoning: readonly string[]
  readonly previousConclusions: readonly string[]
  readonly previousInvestigations: readonly string[]
  readonly previousRisks: readonly string[]
  readonly previousArchitectureObservations: readonly string[]
  readonly previousDependencyObservations: readonly string[]
  readonly previousVerificationResults: readonly string[]
  readonly previousRecommendations: readonly string[]
  readonly reuseCount: number
  readonly specialistDecisions: readonly {
    readonly specialistID: string
    readonly decision: string
    readonly rationale: string
    readonly confidence: number
  }[]
  readonly specialistRecommendations: readonly {
    readonly specialistID: string
    readonly recommendation: string
    readonly priority: "high" | "medium" | "low"
  }[]
  readonly approvals: readonly {
    readonly specialistID: string
    readonly approvedBy: string
    readonly approvedAt: number
  }[]
  readonly escalations: readonly {
    readonly specialistID: string
    readonly escalatedTo: string
    readonly reason: string
  }[]
}

export interface ReasoningReuseStats {
  readonly reuseCount: number
  readonly storedReasoning: number
}

export interface Interface {
  readonly initialize: (sessionID: string) => Effect.Effect<void>
  readonly get: Effect.Effect<ReasoningMemoryData>
  readonly addReasoning: (text: string) => Effect.Effect<void>
  readonly addConclusion: (text: string) => Effect.Effect<void>
  readonly addInvestigation: (text: string) => Effect.Effect<void>
  readonly addRisk: (text: string) => Effect.Effect<void>
  readonly addArchitectureObservation: (text: string) => Effect.Effect<void>
  readonly addDependencyObservation: (text: string) => Effect.Effect<void>
  readonly addVerificationResult: (text: string) => Effect.Effect<void>
  readonly addRecommendation: (text: string) => Effect.Effect<void>
  readonly recordReuse: () => Effect.Effect<void>
  readonly hasPriorReasoning: Effect.Effect<boolean>
  readonly getReuseStats: Effect.Effect<ReasoningReuseStats>
  readonly reset: Effect.Effect<void>
  readonly recordSpecialistDecision: (
    decision: ReasoningMemoryData["specialistDecisions"][number]
  ) => Effect.Effect<void>
  readonly recordSpecialistRecommendation: (
    recommendation: ReasoningMemoryData["specialistRecommendations"][number]
  ) => Effect.Effect<void>
  readonly recordApproval: (
    approval: ReasoningMemoryData["approvals"][number]
  ) => Effect.Effect<void>
  readonly recordEscalation: (
    escalation: ReasoningMemoryData["escalations"][number]
  ) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ReasoningMemory") {}

function initial(sessionID: string): ReasoningMemoryData {
  return {
    sessionID,
    previousReasoning: [],
    previousConclusions: [],
    previousInvestigations: [],
    previousRisks: [],
    previousArchitectureObservations: [],
    previousDependencyObservations: [],
    previousVerificationResults: [],
    previousRecommendations: [],
    reuseCount: 0,
    specialistDecisions: [],
    specialistRecommendations: [],
    approvals: [],
    escalations: [],
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<ReasoningMemoryData>(initial(""))

    const push = (key: keyof Omit<ReasoningMemoryData, "sessionID" | "reuseCount">, value: string) =>
      Ref.update(store, (s) => ({ ...s, [key]: [...(s[key] as readonly string[]), value] }))

    const initialize = Effect.fn("ReasoningMemory.initialize")(function* (sessionID: string) {
      const state = yield* Ref.get(store)
      if (state.sessionID === sessionID && state.sessionID !== "") return
      yield* Ref.set(store, initial(sessionID))
    })

    const get = Ref.get(store)

    const addReasoning = Effect.fn("ReasoningMemory.addReasoning")(function* (text: string) {
      yield* push("previousReasoning", text)
    })
    const addConclusion = Effect.fn("ReasoningMemory.addConclusion")(function* (text: string) {
      yield* push("previousConclusions", text)
    })
    const addInvestigation = Effect.fn("ReasoningMemory.addInvestigation")(function* (text: string) {
      yield* push("previousInvestigations", text)
    })
    const addRisk = Effect.fn("ReasoningMemory.addRisk")(function* (text: string) {
      yield* push("previousRisks", text)
    })
    const addArchitectureObservation = Effect.fn("ReasoningMemory.addArchitectureObservation")(function* (text: string) {
      yield* push("previousArchitectureObservations", text)
    })
    const addDependencyObservation = Effect.fn("ReasoningMemory.addDependencyObservation")(function* (text: string) {
      yield* push("previousDependencyObservations", text)
    })
    const addVerificationResult = Effect.fn("ReasoningMemory.addVerificationResult")(function* (text: string) {
      yield* push("previousVerificationResults", text)
    })
    const addRecommendation = Effect.fn("ReasoningMemory.addRecommendation")(function* (text: string) {
      yield* push("previousRecommendations", text)
    })

    const recordReuse = Effect.fn("ReasoningMemory.recordReuse")(function* () {
      yield* Ref.update(store, (s) => ({ ...s, reuseCount: s.reuseCount + 1 }))
    })

    const hasPriorReasoning = Effect.map(Ref.get(store), (s) => s.previousReasoning.length > 0)

    const getReuseStats = Effect.map(
      Ref.get(store),
      (s): ReasoningReuseStats => ({ reuseCount: s.reuseCount, storedReasoning: s.previousReasoning.length }),
    )

    const reset = Ref.set(store, initial(""))

    const recordSpecialistDecision = Effect.fn("ReasoningMemory.recordSpecialistDecision")(
      function* (decision: ReasoningMemoryData["specialistDecisions"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, specialistDecisions: [...s.specialistDecisions, decision] }))
      },
    )

    const recordSpecialistRecommendation = Effect.fn("ReasoningMemory.recordSpecialistRecommendation")(
      function* (recommendation: ReasoningMemoryData["specialistRecommendations"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, specialistRecommendations: [...s.specialistRecommendations, recommendation] }))
      },
    )

    const recordApproval = Effect.fn("ReasoningMemory.recordApproval")(
      function* (approval: ReasoningMemoryData["approvals"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, approvals: [...s.approvals, approval] }))
      },
    )

    const recordEscalation = Effect.fn("ReasoningMemory.recordEscalation")(
      function* (escalation: ReasoningMemoryData["escalations"][number]) {
        yield* Ref.update(store, (s) => ({ ...s, escalations: [...s.escalations, escalation] }))
      },
    )

    return Service.of({
      initialize, get, addReasoning, addConclusion, addInvestigation, addRisk,
      addArchitectureObservation, addDependencyObservation, addVerificationResult, addRecommendation,
      recordReuse, hasPriorReasoning, getReuseStats, reset,
      recordSpecialistDecision, recordSpecialistRecommendation, recordApproval, recordEscalation,
    })
  }),
)

export { layer }
