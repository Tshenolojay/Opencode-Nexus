export * as PromptAugmentation from "./prompt-augmentation"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "./execution-package"

export interface PromptAugmentation {
  readonly repositorySummary: string | undefined
  readonly architectureNotes: string | undefined
  readonly dependencyNotes: string | undefined
  readonly verificationNotes: string | undefined
  readonly documentationNotes: string | undefined
  readonly contextNotes: string | undefined
  readonly planningNotes: string | undefined
  readonly augmentedText: string | undefined
}

export interface Interface {
  readonly build: (pkg: ExecutionPackage) => Effect.Effect<PromptAugmentation>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PromptAugmentation") {}

const build: Interface["build"] = Effect.fn("PromptAugmentation.build")(function* (pkg) {
  const repo = pkg.repositoryIntelligence?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary
  const arch = pkg.architectureIntelligence?.summary ?? pkg.knowledgeBundle.architectureSummary
  const dep = pkg.dependencyIntelligence?.summary
  const ver = pkg.verificationIntelligence?.summary
  const doc = pkg.documentationIntelligence?.summary
  const ctx = pkg.contextIntelligence?.optimizedSummary ?? pkg.knowledgeBundle.contextSummary
  const plan = pkg.planningPolicy ? `Policy: max ${pkg.planningPolicy.maxSpecialists} specialists, ${pkg.planningPolicy.maxParallelism ?? 1} parallel` : undefined

  const parts: string[] = []
  if (repo) parts.push(`Repository: ${repo.slice(0, 500)}`)
  if (arch) parts.push(`Architecture: ${arch.slice(0, 500)}`)
  if (dep) parts.push(`Dependencies: ${dep.slice(0, 300)}`)
  if (ver) parts.push(`Verification: ${ver.slice(0, 300)}`)
  if (doc) parts.push(`Documentation: ${doc.slice(0, 300)}`)
  if (ctx) parts.push(`Context: ${ctx.slice(0, 300)}`)
  if (plan) parts.push(plan)

  return {
    repositorySummary: repo?.slice(0, 500),
    architectureNotes: arch?.slice(0, 500),
    dependencyNotes: dep?.slice(0, 300),
    verificationNotes: ver?.slice(0, 300),
    documentationNotes: doc?.slice(0, 300),
    contextNotes: ctx?.slice(0, 300),
    planningNotes: plan,
    augmentedText: parts.length > 0 ? parts.join("\n\n") : undefined,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
