export * as CachePolicies from "./cache-policies"

import { Duration } from "effect"

export interface CachePolicy {
  readonly key: string
  readonly ttl: Duration.Duration
  readonly description: string
  readonly scope: "session" | "repository" | "global"
}

export const RepositorySummary: CachePolicy = {
  key: "repository-summary",
  ttl: Duration.hours(24),
  description: "Repository summaries are valid for 24 hours",
  scope: "repository",
}

export const ArchitectureSummary: CachePolicy = {
  key: "architecture-summary",
  ttl: Duration.hours(24),
  description: "Architecture summaries are valid for 24 hours",
  scope: "repository",
}

export const DocumentationSummary: CachePolicy = {
  key: "documentation-analysis",
  ttl: Duration.hours(12),
  description: "Documentation analysis is valid for 12 hours",
  scope: "repository",
}

export const DependencySummary: CachePolicy = {
  key: "dependency-analysis",
  ttl: Duration.infinity,
  description: "Dependency summary is valid until repository changes",
  scope: "repository",
}

export const VerificationResults: CachePolicy = {
  key: "verification-results",
  ttl: Duration.seconds(0),
  description: "Verification results are valid for the current session only",
  scope: "session",
}

export const ContextSummary: CachePolicy = {
  key: "search-results",
  ttl: Duration.seconds(0),
  description: "Context summary is valid for the current session only",
  scope: "session",
}

export const DefaultPolicies: readonly CachePolicy[] = [
  RepositorySummary,
  ArchitectureSummary,
  DocumentationSummary,
  DependencySummary,
  VerificationResults,
  ContextSummary,
]
