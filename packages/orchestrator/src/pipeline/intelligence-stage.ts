import { Effect } from "effect"
import type { PipelineState } from "./pipeline"
import { KnowledgeCollector } from "../execution/knowledge-collector"
import { KnowledgeMerger } from "../execution/knowledge-merger"
import { KnowledgeValidator } from "../intelligence/knowledge-validator"
import { RankingEngine } from "../intelligence/ranking-engine"
import { RepositoryIntelligence } from "../intelligence/repository-intelligence"
import { ContextIntelligence } from "../intelligence/context-intelligence"
import { DependencyIntelligence } from "../intelligence/dependency-intelligence"
import { DocumentationIntelligence } from "../intelligence/documentation-intelligence"
import { ArchitectureIntelligence } from "../intelligence/architecture-intelligence"
import { VerificationIntelligence } from "../intelligence/verification-intelligence"
import { KnowledgeBundle } from "../knowledge/knowledge"

export const runIntelligenceStage = Effect.fn("Pipeline.intelligence")(function* (state: PipelineState) {
  const collector = yield* KnowledgeCollector.Service
  const merger = yield* KnowledgeMerger.Service
  const validator = yield* KnowledgeValidator.Service
  const rankingEngine = yield* RankingEngine.Service
  const repoIntelligence = yield* RepositoryIntelligence.Service
  const contextIntelligence = yield* ContextIntelligence.Service
  const depIntelligence = yield* DependencyIntelligence.Service
  const docIntelligence = yield* DocumentationIntelligence.Service
  const archIntelligence = yield* ArchitectureIntelligence.Service
  const verIntelligence = yield* VerificationIntelligence.Service

  const results = state.runtimeOutput?.results ?? []

  const collected = yield* collector.collect(results)

  const knowledgeBundle = yield* merger.merge({
    base: KnowledgeBundle.empty(state.classification.type),
    collected,
    results,
  })
  knowledgeBundle.planMetadata = {
    planStartTime: Date.now(),
    planEndTime: undefined,
    knowledgeVersion: 1,
    source: "specialist-execution" as const,
  }
  knowledgeBundle.knowledgeRequirements = results.length > 0
    ? results[0]?.collectedKnowledge.map((k) => ({
        domain: k.type,
        description: `Knowledge entry: ${k.type}`,
        required: true,
      }))
    : undefined
  knowledgeBundle.searchTargets = state.classification.requiresSearch
    ? [{ pattern: state.classification.type, description: "Search for relevant code", priority: 1, type: "code" as const }]
    : undefined
  knowledgeBundle.verificationTargets = state.classification.requiresVerification
    ? [{ target: state.classification.type, criteria: "Verify task requirements", priority: 1 }]
    : undefined

  const validatedResults = yield* Effect.forEach(
    results,
    (r) => validator.validate(r),
  )
  const totalInvalid = validatedResults.reduce((acc, v) => acc + v.invalidCount, 0)

  const allEntries = results.flatMap((r) => r.collectedKnowledge)
  const ranked = yield* rankingEngine.rank(allEntries, state.input.promptText)

  const repoAnalysis = yield* repoIntelligence.analyze(knowledgeBundle)
  const depAnalysis = yield* depIntelligence.analyze(knowledgeBundle)
  const docAnalysis = yield* docIntelligence.analyze(knowledgeBundle)
  const archAnalysis = yield* archIntelligence.analyze(knowledgeBundle)
  const verAnalysis = yield* verIntelligence.analyze(knowledgeBundle)
  const ctxReport = yield* contextIntelligence.prepare(knowledgeBundle)

  return {
    ...state,
    knowledgeBundle,
    repoAnalysis,
    depAnalysis,
    docAnalysis,
    archAnalysis,
    verAnalysis,
    ctxReport,
    diagnostics: [
      ...state.diagnostics,
      { phase: "knowledge-validation", durationMs: 0, result: `validated=${validatedResults.reduce((a, v) => a + v.entries.length, 0)} invalid=${totalInvalid}`, error: undefined },
      { phase: "knowledge-ranking", durationMs: 0, result: `ranked=${ranked.length}`, error: undefined },
      { phase: "repository-intelligence", durationMs: 0, result: `hotspots=${repoAnalysis.hotspots.length}`, error: undefined },
      { phase: "dependency-intelligence", durationMs: 0, result: `chains=${depAnalysis.chains.length}`, error: undefined },
      { phase: "documentation-intelligence", durationMs: 0, result: `docs=${docAnalysis.docs.length}`, error: undefined },
      { phase: "architecture-intelligence", durationMs: 0, result: `subsystems=${archAnalysis.subsystems.length}`, error: undefined },
      { phase: "verification-intelligence", durationMs: 0, result: `passed=${verAnalysis.mergedResults.filter((r) => r.passed).length}`, error: undefined },
      { phase: "context-intelligence", durationMs: 0, result: `quality=${(ctxReport.averageConfidence * 100).toFixed(0)}%`, error: undefined },
    ],
  } as PipelineState
})
