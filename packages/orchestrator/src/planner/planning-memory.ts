export * as PlanningMemory from "./planning-memory"

import { Context, Effect, Layer, Ref } from "effect"
import type { SpecialistProfile, SpecialistMatch } from "../specialists/registry"
import type { CapabilityPlan } from "./capability-planner"
import type { KnowledgePlan, KnowledgeRequest } from "./knowledge-planner"
import type { ExecutionGraph } from "./execution-graph"
import type { PlanningPolicy } from "./planning-policy"
import type { SpecialistResult } from "../execution/specialist-result"
import type { ExecutionPackage } from "../integration/execution-package"

export interface PlanningMemoryData {
  readonly sessionID: string
  readonly startTime: number
  readonly specialistPlan: SpecialistPlanData | undefined
  readonly capabilityPlan: CapabilityPlan | undefined
  readonly knowledgePlan: KnowledgePlan | undefined
  readonly executionGraph: ExecutionGraph | undefined
  readonly policy: PlanningPolicy | undefined
  readonly completedRequests: readonly KnowledgeRequest[]
  readonly failedRequests: readonly KnowledgeRequest[]
  readonly errors: readonly string[]
  readonly completedSpecialists: readonly SpecialistResult[]
  readonly failedSpecialists: readonly { readonly id: string; readonly error: string }[]
  readonly retryHistory: readonly { readonly id: string; readonly attempts: number }[]
  readonly executionMetrics: Readonly<Record<string, number>>
  readonly reusableKnowledge: readonly string[]
  readonly cachedExecutionPackage: ExecutionPackage | undefined
  readonly executionPackageReuseCount: number
}

export interface SpecialistPlanData {
  readonly selected: readonly SpecialistMatch[]
  readonly executionOrder: readonly string[]
  readonly parallelGroups: readonly string[][]
  readonly dependencies: readonly { from: string; to: string }[]
}

export interface Interface {
  readonly initialize: (sessionID: string) => Effect.Effect<void>
  readonly get: Effect.Effect<PlanningMemoryData>
  readonly updateSpecialistPlan: (plan: SpecialistPlanData) => Effect.Effect<void>
  readonly updateCapabilityPlan: (plan: CapabilityPlan) => Effect.Effect<void>
  readonly updateKnowledgePlan: (plan: KnowledgePlan) => Effect.Effect<void>
  readonly updateExecutionGraph: (graph: ExecutionGraph) => Effect.Effect<void>
  readonly updatePolicy: (policy: PlanningPolicy) => Effect.Effect<void>
  readonly completeRequest: (requestID: string) => Effect.Effect<void>
  readonly failRequest: (requestID: string) => Effect.Effect<void>
  readonly addError: (error: string) => Effect.Effect<void>
  readonly completeSpecialist: (result: SpecialistResult) => Effect.Effect<void>
  readonly failSpecialist: (id: string, error: string) => Effect.Effect<void>
  readonly recordRetry: (id: string, attempts: number) => Effect.Effect<void>
  readonly recordMetric: (key: string, value: number) => Effect.Effect<void>
  readonly addReusableKnowledge: (knowledge: string) => Effect.Effect<void>
  readonly findReusableKnowledge: (specialistID: string) => Effect.Effect<readonly string[]>
  readonly hasSpecialistRun: (specialistID: string) => Effect.Effect<boolean>
  readonly getPreviousKnowledgeForType: (knowledgeType: string) => Effect.Effect<readonly string[]>
  readonly cacheExecutionPackage: (pkg: ExecutionPackage) => Effect.Effect<void>
  readonly getCachedExecutionPackage: Effect.Effect<ExecutionPackage | undefined>
  readonly getExecutionPackageReuseCount: Effect.Effect<number>
  readonly reset: Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PlanningMemory") {}

function initial(sessionID: string): PlanningMemoryData {
  return {
    sessionID,
    startTime: Date.now(),
    specialistPlan: undefined,
    capabilityPlan: undefined,
    knowledgePlan: undefined,
    executionGraph: undefined,
    policy: undefined,
    completedRequests: [],
    failedRequests: [],
    errors: [],
    completedSpecialists: [],
    failedSpecialists: [],
    retryHistory: [],
    executionMetrics: {},
    reusableKnowledge: [],
    cachedExecutionPackage: undefined,
    executionPackageReuseCount: 0,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const store = yield* Ref.make<PlanningMemoryData>(initial(""))

    const initialize = Effect.fn("PlanningMemory.initialize")(function* (sessionID: string) {
      yield* Ref.set(store, initial(sessionID))
    })

    const get = Ref.get(store)

    const updateSpecialistPlan = Effect.fn("PlanningMemory.updateSpecialistPlan")(function* (plan: SpecialistPlanData) {
      yield* Ref.update(store, (s) => ({ ...s, specialistPlan: plan }))
    })

    const updateCapabilityPlan = Effect.fn("PlanningMemory.updateCapabilityPlan")(function* (plan: CapabilityPlan) {
      yield* Ref.update(store, (s) => ({ ...s, capabilityPlan: plan }))
    })

    const updateKnowledgePlan = Effect.fn("PlanningMemory.updateKnowledgePlan")(function* (plan: KnowledgePlan) {
      yield* Ref.update(store, (s) => ({ ...s, knowledgePlan: plan }))
    })

    const updateExecutionGraph = Effect.fn("PlanningMemory.updateExecutionGraph")(function* (graph: ExecutionGraph) {
      yield* Ref.update(store, (s) => ({ ...s, executionGraph: graph }))
    })

    const updatePolicy = Effect.fn("PlanningMemory.updatePolicy")(function* (policy: PlanningPolicy) {
      yield* Ref.update(store, (s) => ({ ...s, policy }))
    })

    const completeRequest = Effect.fn("PlanningMemory.completeRequest")(function* (requestID: string) {
      yield* Ref.update(store, (s) => {
        const request = s.knowledgePlan?.requests.find((r) => r.id === requestID)
        if (!request) return s
        return {
          ...s,
          completedRequests: [...s.completedRequests, { ...request, status: "completed" }],
        }
      })
    })

    const failRequest = Effect.fn("PlanningMemory.failRequest")(function* (requestID: string) {
      yield* Ref.update(store, (s) => {
        const request = s.knowledgePlan?.requests.find((r) => r.id === requestID)
        if (!request) return s
        return {
          ...s,
          failedRequests: [...s.failedRequests, { ...request, status: "failed" }],
        }
      })
    })

    const addError = Effect.fn("PlanningMemory.addError")(function* (error: string) {
      yield* Ref.update(store, (s) => ({ ...s, errors: [...s.errors, error] }))
    })

    const completeSpecialist = Effect.fn("PlanningMemory.completeSpecialist")(function* (result: SpecialistResult) {
      yield* Ref.update(store, (s) => ({
        ...s,
        completedSpecialists: [...s.completedSpecialists, result],
        reusableKnowledge: [...s.reusableKnowledge, ...result.collectedKnowledge.map((c) => c.content)],
      }))
    })

    const failSpecialist = Effect.fn("PlanningMemory.failSpecialist")(function* (id: string, error: string) {
      yield* Ref.update(store, (s) => ({
        ...s,
        failedSpecialists: [...s.failedSpecialists, { id, error }],
      }))
    })

    const recordRetry = Effect.fn("PlanningMemory.recordRetry")(function* (id: string, attempts: number) {
      yield* Ref.update(store, (s) => ({
        ...s,
        retryHistory: [...s.retryHistory.filter((r) => r.id !== id), { id, attempts }],
      }))
    })

    const recordMetric = Effect.fn("PlanningMemory.recordMetric")(function* (key: string, value: number) {
      yield* Ref.update(store, (s) => ({
        ...s,
        executionMetrics: { ...s.executionMetrics, [key]: value },
      }))
    })

    const addReusableKnowledge = Effect.fn("PlanningMemory.addReusableKnowledge")(function* (knowledge: string) {
      yield* Ref.update(store, (s) => ({
        ...s,
        reusableKnowledge: [...s.reusableKnowledge, knowledge],
      }))
    })

    const findReusableKnowledge = Effect.fn("PlanningMemory.findReusableKnowledge")(function* (specialistID: string) {
      const state = yield* Ref.get(store)
      const relevant = state.completedSpecialists
        .filter((r) => r.specialistID === specialistID)
        .flatMap((r) => r.collectedKnowledge.map((c) => c.content))
      return [...new Set([...relevant, ...state.reusableKnowledge])]
    })

    const hasSpecialistRun = Effect.fn("PlanningMemory.hasSpecialistRun")(function* (specialistID: string) {
      const state = yield* Ref.get(store)
      return state.completedSpecialists.some((r) => r.specialistID === specialistID)
    })

    const getPreviousKnowledgeForType = Effect.fn("PlanningMemory.getPreviousKnowledgeForType")(function* (knowledgeType: string) {
      const state = yield* Ref.get(store)
      return state.completedSpecialists
        .flatMap((r) => r.collectedKnowledge)
        .filter((k) => k.type === knowledgeType)
        .map((k) => k.content)
    })

    const cacheExecutionPackage = Effect.fn("PlanningMemory.cacheExecutionPackage")(function* (pkg: ExecutionPackage) {
      yield* Ref.update(store, (s) => ({
        ...s,
        cachedExecutionPackage: pkg,
        executionPackageReuseCount: s.executionPackageReuseCount + 1,
      }))
    })

    const getCachedExecutionPackage = Effect.map(
      Ref.get(store),
      (s) => s.cachedExecutionPackage,
    )

    const getExecutionPackageReuseCount = Effect.map(
      Ref.get(store),
      (s) => s.executionPackageReuseCount,
    )

    const reset = Ref.set(store, initial(""))

    return Service.of({
      initialize, get, updateSpecialistPlan,
      updateCapabilityPlan, updateKnowledgePlan,
      updateExecutionGraph, updatePolicy,
      completeRequest, failRequest, addError,
      completeSpecialist, failSpecialist, recordRetry,
      recordMetric, addReusableKnowledge,
      findReusableKnowledge, hasSpecialistRun, getPreviousKnowledgeForType,
      cacheExecutionPackage, getCachedExecutionPackage, getExecutionPackageReuseCount,
      reset,
    })
  }),
)

export { layer }
