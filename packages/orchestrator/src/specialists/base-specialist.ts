import { Effect, Context } from "effect"
import type { KnowledgeBundle } from "../knowledge/knowledge"
import type { SpecialistResult } from "../execution/specialist-result"
import type { TaskType } from "../types/classification"
import type { ValidationResult } from "../intelligence/knowledge-validator"
import type { ExecutionPackage } from "../integration/execution-package"
import type {
  SpecialistProfile,
  SpecialistContract,
  SpecialistLifecycle,
  SpecialistDecisionRules,
  SpecialistModelRequirements,
} from "./profiles"

export type ReviewVerdict = "approved" | "changes-requested" | "needs-escalation" | "failed"

export interface SpecialistExecutionInput {
  readonly bundle: KnowledgeBundle
  readonly taskObjective: string
  readonly taskType: TaskType
  readonly sessionID: string
  readonly executionPackage?: ExecutionPackage | undefined
}

export interface BaseSpecialistInterface {
  readonly id: string
  readonly profile: SpecialistProfile
  readonly execute: (input: SpecialistExecutionInput) => Effect.Effect<SpecialistResult>
  readonly review: (result: SpecialistResult) => Effect.Effect<ReviewVerdict>
  readonly validate: (result: SpecialistResult) => Effect.Effect<ValidationResult>
  readonly canHandle: (taskType: TaskType) => boolean
  readonly getContract: () => SpecialistContract
  readonly getLifecycle: () => SpecialistLifecycle
  readonly getDecisionRules: () => SpecialistDecisionRules
  readonly getModelRequirements: () => SpecialistModelRequirements
}

export class BaseSpecialistService extends Context.Service<BaseSpecialistService, BaseSpecialistInterface>()(
  "@opencode/orchestrator/BaseSpecialist",
) {}
