export * as VerificationView from "./verification-view"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"

export interface VerificationViewData {
  readonly summary: string | undefined
  readonly totalTests: number
  readonly passed: number
  readonly failed: number
}

export interface Interface {
  readonly project: (pkg: ExecutionPackage) => Effect.Effect<VerificationViewData>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/VerificationView") {}

const project: Interface["project"] = Effect.fn("VerificationView.project")(function* (pkg) {
  const vi = pkg.verificationIntelligence
  const results = vi?.mergedResults ?? pkg.knowledgeBundle.verificationResults
  const passed = results.filter((r) => r.passed).length
  return {
    summary: vi?.summary,
    totalTests: results.length,
    passed,
    failed: results.length - passed,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ project })
  }),
)

export { layer }
