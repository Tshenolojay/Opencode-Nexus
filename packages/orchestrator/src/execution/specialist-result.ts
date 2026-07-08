export * as SpecialistResult from "./specialist-result"

export interface SpecialistResult {
  readonly specialistID: string
  readonly specialistName: string
  readonly executionTime: number
  readonly startTime: number
  readonly endTime: number
  readonly confidence: number
  readonly capabilitiesUsed: readonly string[]
  readonly collectedKnowledge: readonly CollectedKnowledgeEntry[]
  readonly contextUsed: string | undefined
  readonly modelCandidate: ModelCandidate | undefined
  readonly warnings: readonly string[]
  readonly errors: readonly string[]
  readonly metadata: Record<string, string>
}

export interface CollectedKnowledgeEntry {
  readonly type: string
  readonly content: string
  readonly source: string
  readonly confidence: number
  readonly timestamp: number
}

export interface ModelCandidate {
  readonly providerID: string
  readonly modelID: string
  readonly matchScore: number
  readonly matchedCapabilities: readonly string[]
  readonly missingCapabilities: readonly string[]
}

export function make(input: {
  readonly specialistID: string
  readonly specialistName: string
  readonly capabilitiesUsed: readonly string[]
  readonly modelCandidate: ModelCandidate | undefined
}): SpecialistResult {
  const now = Date.now()
  return {
    specialistID: input.specialistID,
    specialistName: input.specialistName,
    executionTime: 0,
    startTime: now,
    endTime: now,
    confidence: 0,
    capabilitiesUsed: input.capabilitiesUsed,
    collectedKnowledge: [],
    contextUsed: undefined,
    modelCandidate: input.modelCandidate,
    warnings: [],
    errors: [],
    metadata: {},
  }
}
