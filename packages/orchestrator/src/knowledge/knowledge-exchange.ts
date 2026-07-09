export * as KnowledgeExchange from "./knowledge-exchange"

import { Array, Context, Effect, Layer, Ref } from "effect"
import type { KnowledgeClaim } from "../session/specialist-session"

export interface Subscription {
  readonly subscriberID: string
  readonly knowledgeTypes: readonly string[]
  readonly sourceIDs: readonly string[] | undefined
}

export interface ExchangeEvent {
  readonly type: "published" | "requested" | "transferred" | "merged" | "versioned"
  readonly knowledgeID: string
  readonly from: string
  readonly to: string | undefined
  readonly knowledgeType: string
  readonly timestamp: number
}

export interface KnowledgeExchangeState {
  readonly claims: Map<string, KnowledgeClaim>
  readonly subscriptions: Map<string, Subscription[]>
  readonly history: ExchangeEvent[]
}

export interface KnowledgeQuery {
  readonly types: readonly string[]
  readonly confidenceMin: number
  readonly owners: readonly string[] | undefined
  readonly since: number | undefined
}

export interface Interface {
  readonly publish: (claim: KnowledgeClaim) => Effect.Effect<void>
  readonly subscribe: (subscriberID: string, knowledgeTypes: readonly string[], sourceIDs?: readonly string[]) => Effect.Effect<void>
  readonly unsubscribe: (subscriberID: string) => Effect.Effect<void>
  readonly request: (from: string, to: string, knowledgeType: string) => Effect.Effect<KnowledgeClaim | undefined>
  readonly query: (query: KnowledgeQuery) => Effect.Effect<readonly KnowledgeClaim[]>
  readonly transfer: (claimID: string, from: string, to: string) => Effect.Effect<KnowledgeClaim | undefined>
  readonly getByOwner: (ownerID: string) => Effect.Effect<readonly KnowledgeClaim[]>
  readonly getByType: (knowledgeType: string) => Effect.Effect<readonly KnowledgeClaim[]>
  readonly getHistory: () => Effect.Effect<readonly ExchangeEvent[]>
  readonly getSubscribers: (knowledgeType: string) => Effect.Effect<readonly string[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/KnowledgeExchange") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* Ref.make<KnowledgeExchangeState>({
      claims: new Map(), subscriptions: new Map(), history: [],
    })

    function record(type: ExchangeEvent["type"], knowledgeID: string, from: string, to: string | undefined, knowledgeType: string) {
      Ref.update(state, (s) => ({
        ...s,
        history: [...s.history, { type, knowledgeID, from, to, knowledgeType, timestamp: Date.now() }],
      }))
    }

    function notifySubscribers(knowledgeType: string, claimID: string, from: string) {
      Ref.update(state, (s) => {
        const subs = s.subscriptions.get(knowledgeType) ?? []
        for (const sub of subs) {
          if (!sub.sourceIDs || sub.sourceIDs.includes(from)) {
            s.history.push({
              type: "transferred", knowledgeID: claimID, from, to: sub.subscriberID,
              knowledgeType, timestamp: Date.now(),
            })
          }
        }
        return s
      })
    }

    const result: Interface = {
      publish: Effect.fn("KnowledgeExchange.publish")(function* (claim) {
        yield* Ref.update(state, (s) => {
          s.claims.set(claim.id, claim)
          return s
        })
        record("published", claim.id, claim.owner, undefined, claim.type)
        notifySubscribers(claim.type, claim.id, claim.owner)
      }),

      subscribe: Effect.fn("KnowledgeExchange.subscribe")(function* (subscriberID, knowledgeTypes, sourceIDs) {
        yield* Ref.update(state, (s) => {
          for (const kt of knowledgeTypes) {
            const subs = s.subscriptions.get(kt) ?? []
            subs.push({ subscriberID, knowledgeTypes: [kt], sourceIDs })
            s.subscriptions.set(kt, subs)
          }
          return s
        })
      }),

      unsubscribe: Effect.fn("KnowledgeExchange.unsubscribe")(function* (subscriberID) {
        yield* Ref.update(state, (s) => {
          for (const [kt, subs] of s.subscriptions) {
            s.subscriptions.set(kt, subs.filter((sub) => sub.subscriberID !== subscriberID))
          }
          return s
        })
      }),

      request: Effect.fn("KnowledgeExchange.request")(function* (from, to, knowledgeType) {
        const s = yield* Ref.get(state)
        const claim = [...s.claims.values()].find(
          (c) => c.owner === to && c.type === knowledgeType,
        )
        if (claim) {
          record("requested", claim.id, from, to, knowledgeType)
          return claim
        }
        return undefined
      }),

      query: Effect.fn("KnowledgeExchange.query")(function* (query) {
        const s = yield* Ref.get(state)
        return [...s.claims.values()].filter((c) => {
          if (!query.types.includes(c.type)) return false
          if (c.confidence < query.confidenceMin) return false
          if (query.owners && !query.owners.includes(c.owner)) return false
          if (query.since && c.timestamp < query.since) return false
          return true
        })
      }),

      transfer: Effect.fn("KnowledgeExchange.transfer")(function* (claimID, from, to) {
        const s = yield* Ref.get(state)
        const claim = s.claims.get(claimID)
        if (claim) {
          record("transferred", claimID, from, to, claim.type)
          return { ...claim, owner: to }
        }
        return undefined
      }),

      getByOwner: Effect.fn("KnowledgeExchange.getByOwner")(function* (ownerID) {
        const s = yield* Ref.get(state)
        return [...s.claims.values()].filter((c) => c.owner === ownerID)
      }),

      getByType: Effect.fn("KnowledgeExchange.getByType")(function* (knowledgeType) {
        const s = yield* Ref.get(state)
        return [...s.claims.values()].filter((c) => c.type === knowledgeType)
      }),

      getHistory: Effect.fn("KnowledgeExchange.getHistory")(function* () {
        const s = yield* Ref.get(state)
        return s.history
      }),

      getSubscribers: Effect.fn("KnowledgeExchange.getSubscribers")(function* (knowledgeType) {
        const s = yield* Ref.get(state)
        return (s.subscriptions.get(knowledgeType) ?? []).map((sub) => sub.subscriberID)
      }),
    }

    return Service.of(result)
  }),
)

export { layer }
