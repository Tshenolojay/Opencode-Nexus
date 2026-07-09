export * as CapabilityMarketplace from "./capability-marketplace"

import { Context, Effect, Layer } from "effect"
import type { VirtualTeam, CapabilityMarketplace as CapMarketplaceState, CapabilityAdvertisement } from "../integration/execution-package"
import { DefaultSpecialists } from "../specialists/profiles"

export interface Interface {
  readonly build: (team: VirtualTeam) => Effect.Effect<CapMarketplaceState>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/CapabilityMarketplace") {}

const build: Interface["build"] = Effect.fn("CapabilityMarketplace.build")(function* (team) {
  const advertisements: CapabilityAdvertisement[] = team.activeParticipants.map((id) => {
    const profile = DefaultSpecialists.find((s) => s.id === id)
    return {
      specialistID: id,
      provides: profile?.produces ?? profile?.requiredCapabilities ?? [],
      consumes: profile?.consumes ?? profile?.preferredKnowledge ?? [],
      requires: profile?.requires ?? [],
      optionalCapabilities: profile?.optionalCapabilities ?? [],
      preferredCapabilities: profile?.preferredCapabilities ?? profile?.preferredKnowledge ?? [],
    }
  })

  return { advertisements }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
