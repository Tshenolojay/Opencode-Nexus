export * as PromptBuilder from "./prompt-builder"

import { Context, Effect, Layer } from "effect"
import type { RuntimeContextData } from "../runtime/runtime-context"

export interface SpecialistPrompt {
  readonly systemPrompt: string
  readonly userPrompt: string
  readonly specialistID: string
}

export const SearchPrompt: string = `You are a Search Specialist analyzing a codebase.
Your goal is to find relevant files, symbols, and patterns.
Focus on identifying files related to the task objective.
Return file paths, symbol names, and relevant code snippets.`

export const RepositoryPrompt: string = `You are a Repository Specialist analyzing project structure.
Your goal is to understand the overall repository organization.
Focus on project layout, directory structure, and code organization patterns.
Return a summary of the repository structure.`

export const DependencyPrompt: string = `You are a Dependency Specialist analyzing module relationships.
Your goal is to understand the dependency graph and import structure.
Focus on imports, exports, and module dependencies.
Return a dependency graph with relationships.`

export const DocumentationPrompt: string = `You are a Documentation Specialist reading project documentation.
Your goal is to gather and summarize documentation context.
Focus on README files, inline comments, API docs, and usage guides.
Return summarized documentation relevant to the task.`

export const ArchitecturePrompt: string = `You are an Architecture Specialist analyzing system design.
Your goal is to understand the architectural context.
Focus on component relationships, design patterns, and system boundaries.
Return an architecture summary with component interactions.`

export const VerificationPrompt: string = `You are a Verification Specialist ensuring correctness.
Your goal is to verify that changes meet requirements.
Focus on validation checks, edge cases, and potential regressions.
Return a verification report with pass/fail status.`

export const ContextPrompt: string = `You are a Context Specialist managing information density.
Your goal is to prepare optimal context for the primary model.
Focus on summarizing conversation history and prioritizing relevant information.
Return a condensed context summary.`

export const PlanningPrompt: string = `You are a Planning Specialist breaking down complex tasks.
Your goal is to create an execution plan for multi-step tasks.
Focus on identifying sub-tasks, dependencies, and execution order.
Return a structured plan with task breakdown.`

export const DefaultPrompt: string = `You are a specialist analyzing a software engineering task.
Focus on providing accurate, well-reasoned insights.
Base your analysis on the available context and knowledge.`

export function getPromptForSpecialist(specialistID: string): string {
  switch (specialistID) {
    case "specialist/search": return SearchPrompt
    case "specialist/repository": return RepositoryPrompt
    case "specialist/dependency": return DependencyPrompt
    case "specialist/documentation": return DocumentationPrompt
    case "specialist/architecture": return ArchitecturePrompt
    case "specialist/verification": return VerificationPrompt
    case "specialist/context": return ContextPrompt
    case "specialist/planning": return PlanningPrompt
    default: return DefaultPrompt
  }
}

export interface Interface {
  readonly buildPrompt: (
    specialistID: string,
    specialistName: string,
    context: RuntimeContextData,
    objective: string,
  ) => Effect.Effect<SpecialistPrompt>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/PromptBuilder") {}

const buildPrompt: Interface["buildPrompt"] = Effect.fn("PromptBuilder.buildPrompt")(function* (specialistID, specialistName, context, objective) {
  const basePrompt = getPromptForSpecialist(specialistID)

  const contextParts: string[] = []
  if (context.repositorySummary) contextParts.push(`Repository: ${context.repositorySummary}`)
  if (context.architectureSummary) contextParts.push(`Architecture: ${context.architectureSummary}`)
  if (context.relevantFiles.length > 0) contextParts.push(`Relevant Files:\n${context.relevantFiles.join("\n")}`)
  if (context.dependencyGraph.length > 0) contextParts.push(`Dependencies:\n${context.dependencyGraph.join("\n")}`)
  if (context.conversationSummary) contextParts.push(`Conversation: ${context.conversationSummary}`)

  const previousContext = context.previousSpecialistOutputs.length > 0
    ? `\nPrevious specialist outputs:\n${context.previousSpecialistOutputs.map((p) => `- ${p.specialistID}: ${p.summary}`).join("\n")}`
    : ""

  const contextBlock = contextParts.length > 0
    ? `\n\nAvailable Context:\n${contextParts.join("\n\n")}${previousContext}`
    : previousContext

  return {
    specialistID,
    systemPrompt: basePrompt,
    userPrompt: `Objective: ${objective}\n\nSpecialist: ${specialistName}${contextBlock}`,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ buildPrompt })
  }),
)

export { layer }
