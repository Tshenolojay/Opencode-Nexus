export * as SpecialistProfiles from "./profiles"

export interface SpecialistContract {
  readonly requires: readonly string[]
  readonly consumes: readonly string[]
  readonly produces: readonly string[]
}

export interface SpecialistProfile {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly purpose: string
  readonly requiredCapabilities: readonly string[]
  readonly preferredKnowledge: readonly string[]
  readonly executionPriority: number
  readonly supportsParallelExecution: boolean
  readonly contract: SpecialistContract
}

export const SearchSpecialist: SpecialistProfile = {
  id: "specialist/search",
  name: "Search Specialist",
  description: "Searches the codebase for relevant files, symbols, and patterns",
  purpose: "Find relevant code and documentation during discovery phase",
  requiredCapabilities: ["search", "repository-understanding"],
  preferredKnowledge: ["repository-summary", "relevant-files", "search-results", "project-structure"],
  executionPriority: 2,
  supportsParallelExecution: true,
  contract: { requires: ["repository-understanding"], consumes: ["search-query"], produces: ["search-results", "relevant-files"] },
}

export const RepositorySpecialist: SpecialistProfile = {
  id: "specialist/repository",
  name: "Repository Specialist",
  description: "Analyzes repository structure, project layout, and code organization",
  purpose: "Understand the overall repository before detailed work",
  requiredCapabilities: ["repository-understanding", "analysis"],
  preferredKnowledge: ["repository-summary", "project-structure", "architecture-summary", "relevant-files"],
  executionPriority: 1,
  supportsParallelExecution: false,
  contract: { requires: ["repository-understanding"], consumes: ["project-path"], produces: ["repository-summary", "project-structure"] },
}

export const DependencySpecialist: SpecialistProfile = {
  id: "specialist/dependency",
  name: "Dependency Specialist",
  description: "Analyzes project dependencies, imports, and module relationships",
  purpose: "Understand dependency graph and module interactions",
  requiredCapabilities: ["search", "analysis"],
  preferredKnowledge: ["dependency-graph", "project-structure", "configuration"],
  executionPriority: 3,
  supportsParallelExecution: true,
  contract: { requires: ["search"], consumes: ["project-structure"], produces: ["dependency-graph", "dependencies"] },
}

export const DocumentationSpecialist: SpecialistProfile = {
  id: "specialist/documentation",
  name: "Documentation Specialist",
  description: "Reads and summarizes documentation, comments, and README files",
  purpose: "Gather documentation context for the task",
  requiredCapabilities: ["search", "long-context"],
  preferredKnowledge: ["documentation", "repository-summary", "external-references"],
  executionPriority: 4,
  supportsParallelExecution: true,
  contract: { requires: ["search"], consumes: ["search-results"], produces: ["documentation", "external-references"] },
}

export const ArchitectureSpecialist: SpecialistProfile = {
  id: "specialist/architecture",
  name: "Architecture Specialist",
  description: "Analyzes system architecture, component relationships, and design patterns",
  purpose: "Understand the architectural context before making changes",
  requiredCapabilities: ["repository-understanding", "analysis", "reasoning"],
  preferredKnowledge: ["architecture-summary", "repository-summary", "dependency-graph", "conversation-summary"],
  executionPriority: 2,
  supportsParallelExecution: false,
  contract: { requires: ["repository-understanding", "analysis"], consumes: ["repository-summary", "dependency-graph"], produces: ["architecture-summary", "architecture-notes"] },
}

export const VerificationSpecialist: SpecialistProfile = {
  id: "specialist/verification",
  name: "Verification Specialist",
  description: "Verifies correctness of code changes, runs validation checks",
  purpose: "Ensure task requirements are met and no regressions introduced",
  requiredCapabilities: ["analysis", "tool-use", "code-generation"],
  preferredKnowledge: ["verification-targets", "relevant-files", "execution-notes"],
  executionPriority: 6,
  supportsParallelExecution: false,
  contract: { requires: ["analysis", "code-generation"], consumes: ["relevant-files", "execution-notes"], produces: ["verification-results", "verification-notes"] },
}

export const ContextSpecialist: SpecialistProfile = {
  id: "specialist/context",
  name: "Context Specialist",
  description: "Manages context windows, summarizes conversation history, and optimizes prompt assembly",
  purpose: "Prepare optimal context for the primary model",
  requiredCapabilities: ["long-context", "reasoning", "analysis"],
  preferredKnowledge: ["conversation-summary", "tool-history", "repository-summary", "architecture-summary"],
  executionPriority: 4,
  supportsParallelExecution: false,
  contract: { requires: ["long-context", "reasoning"], consumes: ["conversation-history", "tool-history"], produces: ["context-summary", "conversation-summary"] },
}

export const PlanningSpecialist: SpecialistProfile = {
  id: "specialist/planning",
  name: "Planning Specialist",
  description: "Breaks down complex tasks into sub-tasks and plans execution order",
  purpose: "Create execution plan for multi-step tasks",
  requiredCapabilities: ["planning", "reasoning", "analysis"],
  preferredKnowledge: ["repository-summary", "architecture-summary", "relevant-files", "conversation-summary"],
  executionPriority: 1,
  supportsParallelExecution: false,
  contract: { requires: ["planning", "reasoning"], consumes: ["repository-summary", "architecture-summary"], produces: ["execution-plan", "task-breakdown"] },
}

export const DefaultSpecialists: readonly SpecialistProfile[] = [
  SearchSpecialist,
  RepositorySpecialist,
  DependencySpecialist,
  DocumentationSpecialist,
  ArchitectureSpecialist,
  VerificationSpecialist,
  ContextSpecialist,
  PlanningSpecialist,
]
