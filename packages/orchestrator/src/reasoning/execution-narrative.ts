export * as ExecutionNarrative from "./execution-narrative"

import { Context, Effect, Layer } from "effect"
import type { ExecutionPackage } from "../integration/execution-package"
import type { SpecialistConsensus as Consensus } from "../integration/execution-package"
import type { ExecutionNarrative as Narrative } from "../integration/execution-package"

export interface Interface {
  readonly build: (pkg: ExecutionPackage, consensus: Consensus) => Effect.Effect<Narrative>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/orchestrator/ExecutionNarrative") {}

const MAX_FINDING = 600

const build: Interface["build"] = Effect.fn("ExecutionNarrative.build")(function* (pkg, consensus) {
  const classification = pkg.taskClassification
  const intel = pkg.executionIntelligence

  const mission = `Analyze and complete a ${classification.type} task with complexity ${classification.complexity}.`
  const objective = intel?.executionObjectives?.join(" ") ?? mission
  const taskSummary = `Task classified as ${classification.type} (confidence ${pkg.confidence}). ${classification.requiresVerification ? "Verification required. " : ""}${classification.requiresDependencyGraph ? "Dependency analysis required. " : ""}${classification.requiresSearch ? "Search required." : ""}`

  const repositoryFindings = (pkg.repositoryIntelligence?.enrichedSummary ?? pkg.knowledgeBundle.repositorySummary)?.slice(0, MAX_FINDING)
  const architectureFindings = (pkg.architectureIntelligence?.summary ?? pkg.knowledgeBundle.architectureSummary)?.slice(0, MAX_FINDING)
  const dependencyFindings = pkg.dependencyIntelligence?.summary?.slice(0, MAX_FINDING)
  const documentationFindings = pkg.documentationIntelligence?.summary?.slice(0, MAX_FINDING)
  const verificationFindings = pkg.verificationIntelligence?.summary?.slice(0, MAX_FINDING)

  const specialistConsensus = consensus.overallConsensus === "strong"
    ? `Specialists strongly agree. ${consensus.agreements.join(" ")}`
    : consensus.overallConsensus === "conflicted"
      ? `Specialists conflict. ${consensus.disagreements.join(" ")}`
      : `Specialists partially align. ${consensus.agreements.join(" ")}`

  const risks = [
    ...(intel?.executionRisks?.map((r) => `[${r.severity}] ${r.risk}`) ?? []),
    ...consensus.verificationGaps.map((g) => `[gap] ${g}`),
  ]
  const constraints = intel?.executionConstraints?.map((c) => `${c.type}: ${c.constraint}`)
  const unknowns = consensus.unresolvedQuestions

  const criticalFiles = pkg.knowledgeBundle.relevantFiles.slice(0, 10)
  const criticalModules = pkg.architectureIntelligence?.subsystems.slice(0, 5)?.map((s) => s.name) ?? []

  const recommendedWorkflow = intel?.workflowAdvice
    ?? (pkg.dispatchPlan?.requiredAgents.length
      ? `Order: ${(pkg.dispatchPlan.executionOrder ?? []).flat().join(" → ") || "planned agents"}`
      : "Proceed with the selected agent directly")

  const executionStrategy = consensus.overallConsensus === "conflicted"
    ? "Resolve disagreements before structural changes; verify incrementally."
    : consensus.overallConsensus === "weak"
      ? "Gather missing evidence before committing to a direction."
      : "Execute the planned workflow, applying verification at completion."

  const expectedOutcome = `Task completed with ${pkg.confidence} confidence; ${consensus.recommendations.length} recommendation(s) to follow.`

  const confidenceSummary = `Overall consensus: ${consensus.overallConsensus} (${Math.round(consensus.overallConfidence * 100)}%). ${consensus.confidenceGaps.length > 0 ? `Gaps: ${consensus.confidenceGaps.join("; ")}` : "No major confidence gaps."}`

  const teamOverview = pkg.virtualTeam
    ? `Team of ${pkg.virtualTeam.members.length} specialists (${pkg.virtualTeam.activeParticipants.length} active).`
    : undefined

  const assignedSpecialists = pkg.workAssignments?.ownership.map((o) => `${o.specialistID} (${o.taskIDs.length} tasks)`) ?? []

  const taskAllocation = pkg.workAssignments?.assignments.map((a) => `Task ${a.taskID} → ${a.specialistID} (priority ${a.executionPriority})`) ?? []

  const collaborationSummary = pkg.teamDiscussion
    ? [
        pkg.teamDiscussion.agreements.length > 0 ? `Agreements: ${pkg.teamDiscussion.agreements.join("; ")}` : undefined,
        pkg.teamDiscussion.disagreements.length > 0 ? `Disagreements: ${pkg.teamDiscussion.disagreements.join("; ")}` : undefined,
        pkg.teamDiscussion.recommendations.length > 0 ? `Recommendations: ${pkg.teamDiscussion.recommendations.join("; ")}` : undefined,
      ]
        .filter(Boolean)
        .join("\n")
    : undefined

  const reviewSummary = pkg.reviewPipeline
    ? `Review pipeline: ${pkg.reviewPipeline.stages.filter((s) => s.status === "completed").length}/${pkg.reviewPipeline.stages.length} stages completed.`
    : undefined

  const capabilitySummary = pkg.capabilityMarketplace
    ? `${pkg.capabilityMarketplace.advertisements.length} specialists advertising capabilities.`
    : undefined

  const remainingQuestions = pkg.teamDiscussion?.unresolvedQuestions ?? pkg.executionNarrative?.remainingQuestions ?? []

  const sections: { title: string; body: string | undefined }[] = [
    { title: "Mission", body: mission },
    { title: "Objective", body: objective },
    { title: "Task Summary", body: taskSummary },
    { title: "Repository Findings", body: repositoryFindings },
    { title: "Architecture Findings", body: architectureFindings },
    { title: "Dependency Findings", body: dependencyFindings },
    { title: "Documentation Findings", body: documentationFindings },
    { title: "Verification Findings", body: verificationFindings },
    { title: "Specialist Consensus", body: specialistConsensus },
    { title: "Risks", body: risks.length > 0 ? risks.join("\n") : undefined },
    { title: "Constraints", body: constraints && constraints.length > 0 ? constraints.join("\n") : undefined },
    { title: "Unknowns", body: unknowns.length > 0 ? unknowns.join("\n") : undefined },
    { title: "Critical Files", body: criticalFiles.length > 0 ? criticalFiles.join("\n") : undefined },
    { title: "Critical Modules", body: criticalModules.length > 0 ? criticalModules.join("\n") : undefined },
    { title: "Recommended Workflow", body: recommendedWorkflow },
    { title: "Execution Strategy", body: executionStrategy },
    { title: "Expected Outcome", body: expectedOutcome },
    { title: "Team Overview", body: teamOverview },
    { title: "Assigned Specialists", body: assignedSpecialists.length > 0 ? assignedSpecialists.join("\n") : undefined },
    { title: "Task Allocation", body: taskAllocation.length > 0 ? taskAllocation.join("\n") : undefined },
    { title: "Collaboration Summary", body: collaborationSummary },
    { title: "Review Summary", body: reviewSummary },
    { title: "Capability Summary", body: capabilitySummary },
    { title: "Remaining Questions", body: remainingQuestions.length > 0 ? remainingQuestions.join("\n") : undefined },
    { title: "Confidence Summary", body: confidenceSummary },
  ]

  const fullText = sections
    .filter((s) => s.body && s.body.trim().length > 0)
    .map((s) => `## ${s.title}\n${s.body}`)
    .join("\n\n")

  return {
    mission,
    objective,
    taskSummary,
    repositoryFindings,
    architectureFindings,
    dependencyFindings,
    documentationFindings,
    verificationFindings,
    specialistConsensus,
    risks: risks.length > 0 ? risks : undefined,
    constraints: constraints && constraints.length > 0 ? constraints : undefined,
    unknowns: unknowns.length > 0 ? unknowns : undefined,
    criticalFiles: criticalFiles.length > 0 ? criticalFiles : undefined,
    criticalModules: criticalModules.length > 0 ? criticalModules : undefined,
    recommendedWorkflow,
    executionStrategy,
    expectedOutcome,
    confidenceSummary,
    teamOverview,
    assignedSpecialists: assignedSpecialists.length > 0 ? assignedSpecialists : undefined,
    taskAllocation: taskAllocation.length > 0 ? taskAllocation : undefined,
    collaborationSummary,
    reviewSummary,
    capabilitySummary,
    remainingQuestions: remainingQuestions.length > 0 ? remainingQuestions : undefined,
    fullText,
  }
})

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({ build })
  }),
)

export { layer }
