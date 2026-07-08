export * as KnowledgeBundle from "./knowledge"

import type { TaskType } from "../types/classification"

export interface KnowledgeEntryMeta {
  readonly sourceSpecialist: string | undefined
  readonly timestamp: number
  readonly confidence: number
  readonly validation: "valid" | "invalid" | "unvalidated"
  readonly ranking: number
  readonly origin: string | undefined
  readonly reusable: boolean
}

export interface KnowledgeBundle {
  readonly taskType: TaskType
  readonly repositorySummary: string | undefined
  readonly relevantFiles: readonly string[]
  readonly relevantSymbols: readonly string[]
  readonly searchResults: readonly SearchResult[]
  readonly dependencyGraph: readonly DependencyInfo[]
  readonly architectureNotes: string | undefined
  readonly architectureSummary: string | undefined
  readonly externalReferences: readonly string[]
  readonly verificationResults: readonly VerificationResult[]
  readonly contextSummary: string | undefined
  readonly planMetadata: KnowledgePlanMetadata | undefined
  readonly knowledgeRequirements: readonly KnowledgeRequirement[] | undefined
  readonly searchTargets: readonly SearchTarget[] | undefined
  readonly verificationTargets: readonly VerificationTarget[] | undefined
  readonly executionNotes: readonly string[] | undefined
  readonly documentation: readonly DocumentationEntry[] | undefined
  readonly configuration: readonly ConfigurationEntry[] | undefined
  readonly projectStructure: readonly string[] | undefined
  readonly conversationSummary: string | undefined
  readonly toolHistory: readonly string[] | undefined
  readonly verificationNotes: readonly string[] | undefined
  readonly searchResultsExternal: readonly SearchResult[] | undefined
  readonly externalKnowledge: readonly string[] | undefined
  readonly dependencies: readonly DependencyInfo[] | undefined
  readonly knowledgeMeta: Readonly<Record<string, KnowledgeEntryMeta>> | undefined
}

export interface DocumentationEntry {
  readonly path: string
  readonly summary: string
  readonly relevantSections: readonly string[]
}

export interface ConfigurationEntry {
  readonly path: string
  readonly key: string
  readonly value: string | undefined
}

export interface SearchResult {
  readonly file: string
  readonly content: string
}

export interface DependencyInfo {
  readonly name: string
  readonly version: string
  readonly relationship: string
}

export interface VerificationResult {
  readonly target: string
  readonly passed: boolean
  readonly details: string
}

export interface SearchTarget {
  readonly pattern: string
  readonly description: string
  readonly priority: number
  readonly type: "code" | "docs" | "config" | "dependency"
}

export interface VerificationTarget {
  readonly target: string
  readonly criteria: string
  readonly priority: number
}

export interface KnowledgeRequirement {
  readonly domain: string
  readonly description: string
  readonly required: boolean
}

export interface KnowledgePlanMetadata {
  readonly planStartTime: number
  readonly planEndTime: number | undefined
  readonly knowledgeVersion: number
  readonly source: "classify" | "manual" | "project-default"
}

export function empty(taskType: TaskType): KnowledgeBundle {
  return {
    taskType,
    repositorySummary: undefined,
    relevantFiles: [],
    relevantSymbols: [],
    searchResults: [],
    dependencyGraph: [],
    architectureNotes: undefined,
    architectureSummary: undefined,
    externalReferences: [],
    verificationResults: [],
    contextSummary: undefined,
    planMetadata: undefined,
    knowledgeRequirements: undefined,
    searchTargets: undefined,
    verificationTargets: undefined,
    executionNotes: undefined,
    documentation: undefined,
    configuration: undefined,
    projectStructure: undefined,
    conversationSummary: undefined,
    toolHistory: undefined,
    verificationNotes: undefined,
    searchResultsExternal: undefined,
    externalKnowledge: undefined,
    dependencies: undefined,
    knowledgeMeta: undefined,
  }
}
