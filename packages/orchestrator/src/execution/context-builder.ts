export * as ContextBuilder from "./context-builder"

import { Context, Effect, Layer } from "effect"
import type { SpecialistProfile } from "../specialists/profiles"
import type { KnowledgeBundle } from "../knowledge/knowledge"

export interface SpecialistContext {
  readonly taskObjective: string
  readonly relevantCode: readonly string[]
  readonly repositoryContext: string | undefined
  readonly architectureContext: string | undefined
  readonly conversationContext: string | undefined
  readonly dependencyContext: readonly string[]
  readonly documentationContext: readonly string[]
  readonly relatedFiles: readonly string[]
  readonly existingKnowledge: readonly string[]
}

export interface BuildInput {
  readonly specialist: SpecialistProfile
  readonly taskObjective: string
  readonly knowledgeBundle: KnowledgeBundle
}

export interface Interface {
  readonly build: (input: BuildInput) => Effect.Effect<SpecialistContext>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ContextBuilder") {}

const build: Interface["build"] = Effect.fn("ContextBuilder.build")(function* (input) {
  const knowledgeBundle = input.knowledgeBundle

  const relevantCode: string[] = []
  if (knowledgeBundle.searchResults.length > 0) {
    for (const sr of knowledgeBundle.searchResults) {
      relevantCode.push(`File: ${sr.file}\n${sr.content}`)
    }
  }

  const architecture: string[] = []
  if (knowledgeBundle.architectureSummary) architecture.push(knowledgeBundle.architectureSummary)
  if (knowledgeBundle.architectureNotes) architecture.push(knowledgeBundle.architectureNotes)
  if (knowledgeBundle.dependencyGraph.length > 0) {
    for (const dep of knowledgeBundle.dependencyGraph) {
      architecture.push(`Dependency: ${dep.name}@${dep.version} (${dep.relationship})`)
    }
  }

  const documentationContext: string[] = []
  if (knowledgeBundle.documentation) {
    for (const doc of knowledgeBundle.documentation) {
      documentationContext.push(`Documentation: ${doc.path}`)
      for (const section of doc.relevantSections) {
        documentationContext.push(`  - ${section}`)
      }
    }
  }

  const relatedFiles: string[] = []
  if (knowledgeBundle.relevantFiles.length > 0) {
    relatedFiles.push(...knowledgeBundle.relevantFiles)
  }
  if (knowledgeBundle.projectStructure) {
    relatedFiles.push(...knowledgeBundle.projectStructure)
  }
  if (knowledgeBundle.relevantSymbols.length > 0) {
    relatedFiles.push(...knowledgeBundle.relevantSymbols)
  }

  const existingKnowledge: string[] = []
  if (knowledgeBundle.conversationSummary) existingKnowledge.push(`Conversation: ${knowledgeBundle.conversationSummary}`)
  if (knowledgeBundle.toolHistory) {
    for (const th of knowledgeBundle.toolHistory) {
      existingKnowledge.push(`Tool: ${th}`)
    }
  }

  if (knowledgeBundle.externalReferences.length > 0) {
    for (const ref of knowledgeBundle.externalReferences) {
      existingKnowledge.push(`Reference: ${ref}`)
    }
  }

  if (knowledgeBundle.externalKnowledge) {
    for (const ek of knowledgeBundle.externalKnowledge) {
      existingKnowledge.push(`External: ${ek}`)
    }
  }

  return {
    taskObjective: input.taskObjective,
    relevantCode,
    repositoryContext: knowledgeBundle.repositorySummary,
    architectureContext: architecture.length > 0 ? architecture.join("\n") : undefined,
    conversationContext: knowledgeBundle.conversationSummary,
    dependencyContext: knowledgeBundle.dependencyGraph.map((d) => `${d.name}@${d.version}`),
    documentationContext,
    relatedFiles: [...new Set(relatedFiles)],
    existingKnowledge,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
