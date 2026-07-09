import { Effect } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { OrchestrationDecision } from "../contracts/service"

export interface ValidationIssue {
  readonly field: string
  readonly message: string
  readonly severity: "info" | "warning"
}

export interface ValidationReport {
  readonly package: ValidationIssue[]
  readonly decision: ValidationIssue[]
  readonly timing: ValidationIssue[]
  readonly passed: boolean
}

export function validateExecutionPackage(pkg: ExecutionPackage): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!pkg.sessionID) issues.push({ field: "sessionID", message: "Missing session ID", severity: "warning" })
  if (!pkg.taskClassification) issues.push({ field: "taskClassification", message: "Missing task classification", severity: "warning" })
  if (!pkg.knowledgeBundle) issues.push({ field: "knowledgeBundle", message: "Missing knowledge bundle", severity: "warning" })

  if (pkg.executionGraph && (!pkg.executionGraph.nodes || pkg.executionGraph.nodes.length === 0)) {
    issues.push({ field: "executionGraph.nodes", message: "Execution graph has no nodes", severity: "info" })
  }

  if (!pkg.repositoryIntelligence?.hotspots && !pkg.knowledgeBundle.repositorySummary) {
    issues.push({ field: "repositoryIntelligence", message: "No repository analysis available", severity: "info" })
  }
  if (!pkg.architectureIntelligence?.subsystems && !pkg.knowledgeBundle.architectureSummary) {
    issues.push({ field: "architectureIntelligence", message: "No architecture analysis available", severity: "info" })
  }

  if (pkg.virtualTeam && (!pkg.virtualTeam.members || pkg.virtualTeam.members.length === 0)) {
    issues.push({ field: "virtualTeam.members", message: "Virtual team has no members", severity: "warning" })
  }

  if (pkg.reviewPipeline && pkg.reviewPipeline.stages.some((s) => s.status === "pending")) {
    issues.push({ field: "reviewPipeline", message: "Some review stages are still pending", severity: "info" })
  }

  return issues
}

export function validateOrchestrationDecision(decision: OrchestrationDecision): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!decision.taskClassification) issues.push({ field: "taskClassification", message: "Missing task classification", severity: "warning" })
  if (!decision.confidence) issues.push({ field: "confidence", message: "Missing confidence level", severity: "warning" })
  if (!decision.knowledgeBundle) issues.push({ field: "knowledgeBundle", message: "Missing knowledge bundle", severity: "warning" })

  if (decision.needsOrchestration && !decision.dispatchPlan) {
    issues.push({ field: "dispatchPlan", message: "Orchestration needed but no dispatch plan", severity: "warning" })
  }

  return issues
}

export function runValidation(pkg: ExecutionPackage, decision: OrchestrationDecision): Effect.Effect<ValidationReport> {
  return Effect.sync(() => {
    const packageIssues = validateExecutionPackage(pkg)
    const decisionIssues = validateOrchestrationDecision(decision)
    const timingIssues: ValidationIssue[] = []

    if (!pkg.timestamp) timingIssues.push({ field: "timestamp", message: "Missing timestamp", severity: "warning" })

    return {
      package: packageIssues,
      decision: decisionIssues,
      timing: timingIssues,
      passed: packageIssues.length === 0 && decisionIssues.length === 0 && timingIssues.length === 0,
    } as ValidationReport
  })
}
