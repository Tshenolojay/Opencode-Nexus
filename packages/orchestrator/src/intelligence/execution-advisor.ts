export * as ExecutionAdvisor from "./execution-advisor"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type {
  ExecutionIntelligence,
  ExecutionRisk,
  ExecutionRecommendation,
  ExecutionConstraint,
  ToolAdvice,
} from "../integration/execution-package"

export interface Interface {
  readonly advise: (pkg: ExecutionPackage) => Effect.Effect<ExecutionIntelligence>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionAdvisor") {}

const advise: Interface["advise"] = Effect.fn("ExecutionAdvisor.advise")(function* (pkg) {
  const classification = pkg.taskClassification
  const risks: ExecutionRisk[] = []
  const recommendations: ExecutionRecommendation[] = []
  const constraints: ExecutionConstraint[] = []
  const reasoningHints: string[] = []

  if (classification.requiresVerification) {
    const conflicts = pkg.verificationIntelligence?.conflicts.length ?? 0
    if (conflicts > 0) {
      risks.push({
        risk: `Verification conflicts detected (${conflicts}); execute verification before completion`,
        severity: "high",
        category: "verification",
      })
    } else {
      constraints.push({ constraint: "Task requires verification before completion", type: "hard" })
      reasoningHints.push("Plan a verification step and use verification tools before declaring done")
    }
  }

  const depCount = pkg.knowledgeBundle.dependencyGraph.length
  if (depCount > 10 || (pkg.dependencyIntelligence?.risks.length ?? 0) > 0) {
    risks.push({
      risk: `High dependency surface (${depCount} nodes); changes may cascade`,
      severity: depCount > 20 ? "high" : "medium",
      category: "dependency",
    })
    recommendations.push({
      recommendation: "Investigate dependency impact before editing shared modules",
      category: "dependency",
      priority: "high",
    })
  }

  const archRisks = pkg.architectureIntelligence?.risks.length ?? 0
  if (archRisks > 0) {
    risks.push({
      risk: `Architecture risk areas present (${archRisks})`,
      severity: "medium",
      category: "architecture",
    })
    recommendations.push({
      recommendation: "Review architecture boundaries before modifying cross-cutting modules",
      category: "architecture",
      priority: "medium",
    })
  }

  const outdatedDocs = pkg.documentationIntelligence?.outdated.length ?? 0
  if (outdatedDocs > 3) {
    recommendations.push({
      recommendation: "Update documentation after implementing changes",
      category: "documentation",
      priority: "low",
    })
  }

  if ((pkg.knowledgeBundle.contextSummary?.length ?? 0) > 2000) {
    risks.push({
      risk: "Large context window; prioritize high-ranked knowledge",
      severity: "low",
      category: "context",
    })
    reasoningHints.push("Focus on the highest-ranked knowledge entries to stay within context limits")
  }

  if ((pkg.dispatchPlan?.requiredAgents.length ?? 0) === 0 && classification.complexity > 3) {
    recommendations.push({
      recommendation: "Task is complex but no specialists planned; consider decomposing into smaller steps",
      category: "workflow",
      priority: "medium",
    })
  }

  if ((pkg.dispatchPlan?.requiredAgents.length ?? 0) > 1) {
    recommendations.push({
      recommendation: `Execute in order: ${(pkg.dispatchPlan?.executionOrder ?? []).flat().join(" → ") || "planned agents"}`,
      category: "workflow",
      priority: "medium",
    })
  }

  recommendations.push({
    recommendation: "Use compressed advisory context to reduce token usage for execution",
    category: "context",
    priority: "low",
  })

  const toolAdvice = buildToolAdvice(pkg)

  const executionPriority: ExecutionIntelligence["executionPriority"] =
    pkg.confidence === "low" ? "high" : pkg.taskClassification.complexity > 5 ? "medium" : "low"

  const executionObjectives = [
    `Classified as ${classification.type} (complexity ${classification.complexity})`,
    pkg.dispatchPlan?.requiredAgents.length
      ? `Coordinate ${pkg.dispatchPlan.requiredAgents.length} specialist agent(s)`
      : "Complete with the selected agent directly",
  ]

  return {
    executionObjectives,
    executionRisks: risks.length > 0 ? risks : undefined,
    executionRecommendations: recommendations.length > 0 ? recommendations : undefined,
    executionConstraints: constraints.length > 0 ? constraints : undefined,
    reasoningHints: reasoningHints.length > 0 ? reasoningHints : undefined,
    workflowAdvice:
      recommendations.find((r) => r.category === "workflow")?.recommendation ??
      "Proceed with the standard execution workflow",
    toolAdvice,
    architectureAdvice: pkg.architectureIntelligence?.summary,
    dependencyAdvice: pkg.dependencyIntelligence?.summary,
    documentationAdvice: pkg.documentationIntelligence?.summary,
    verificationAdvice: pkg.verificationIntelligence?.summary,
    performanceAdvice:
      (pkg.runtimeMetrics?.executionDurationMs ?? 0) > 1000
        ? "Previous execution was slow; prefer cached knowledge and avoid redundant work"
        : undefined,
    qualityAdvice:
      risks.some((r) => r.category === "verification")
        ? "Maintain verification coverage to preserve quality"
        : undefined,
    executionPriority,
    streamingMetadata: undefined,
  }
})

function buildToolAdvice(pkg: ExecutionPackage): ToolAdvice {
  const suggested: string[] = []
  const verification: string[] = []
  const avoid: string[] = []

  if (pkg.taskClassification.requiresSearch) suggested.push("search", "grep")
  if (pkg.taskClassification.requiresDependencyGraph) suggested.push("dependency-graph")
  if (pkg.taskClassification.requiresVerification) {
    suggested.push("run-tests")
    verification.push("run-tests")
  }
  if (pkg.taskClassification.requiresContext) suggested.push("read", "grep")

  if ((pkg.dependencyIntelligence?.affectedPackages.length ?? 0) > 0) avoid.push("bulk-edit")

  const preferredOrder = suggested.length > 0 ? suggested : ["read", "grep"]

  const priority: Record<string, number> = {}
  suggested.forEach((tool, i) => {
    priority[tool] = suggested.length - i
  })

  return {
    suggestedTools: suggested,
    preferredExecutionOrder: preferredOrder,
    parallelSafeGroups: suggested.length > 0 ? [suggested] : [],
    verificationTools: verification,
    avoidTools: avoid,
    toolPriority: priority,
    toolReasoning: suggested.length > 0 ? "Tools selected from task classification signals" : undefined,
  }
}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ advise })
  }),
)

export { layer }
