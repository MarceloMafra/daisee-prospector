export interface DAISEEInput {
  seniority: string
  companySize?: 'MICRO' | 'PEQUENA' | 'MEDIA' | 'GRANDE'
  segmentMatch?: number // 0-100
}

export interface DAISEEResult {
  score: number
  decisionPower: number
  companySize: number
  segmentMatch: number
}

export function calculateDAISEEScore(input: DAISEEInput): DAISEEResult {
  let decisionPower = 0
  let companySizeScore = 0
  let segmentMatchScore = input.segmentMatch || 0

  // Decision Power (Seniority) - 30% weight
  const seniorityLower = input.seniority.toLowerCase()

  if (
    seniorityLower.includes('ceo') ||
    seniorityLower.includes('president') ||
    seniorityLower.includes('founder')
  ) {
    decisionPower = 90
  } else if (
    seniorityLower.includes('vp') ||
    seniorityLower.includes('vice president') ||
    seniorityLower.includes('c-level')
  ) {
    decisionPower = 80
  } else if (
    seniorityLower.includes('director') ||
    seniorityLower.includes('head of')
  ) {
    decisionPower = 70
  } else if (
    seniorityLower.includes('manager') ||
    seniorityLower.includes('lead')
  ) {
    decisionPower = 50
  } else if (
    seniorityLower.includes('specialist') ||
    seniorityLower.includes('senior')
  ) {
    decisionPower = 40
  } else if (seniorityLower.includes('junior') || seniorityLower.includes('associate')) {
    decisionPower = 20
  } else {
    decisionPower = 10
  }

  // Company Size - 35% weight
  switch (input.companySize) {
    case 'GRANDE': // 250+
      companySizeScore = 100
      break
    case 'MEDIA': // 50-249
      companySizeScore = 80
      break
    case 'PEQUENA': // 10-49
      companySizeScore = 50
      break
    case 'MICRO': // 1-9
      companySizeScore = 20
      break
    default:
      companySizeScore = 30 // Unknown
  }

  // Clamp segment match to 0-100
  const clampedSegmentMatch = Math.min(Math.max(segmentMatchScore || 0, 0), 100)

  // Calculate weighted score
  // Decision Power: 30%, Company Size: 35%, Segment Match: 25%, Other: 10%
  const weightedScore =
    (decisionPower * 0.3 +
      companySizeScore * 0.35 +
      clampedSegmentMatch * 0.25 +
      50 * 0.1) // 50 is baseline for "other" (10%)

  // Clamp final score to 0-100
  const finalScore = Math.min(Math.max(weightedScore, 0), 100)

  return {
    score: Math.round(finalScore * 10) / 10, // Round to 1 decimal place
    decisionPower,
    companySize: companySizeScore,
    segmentMatch: clampedSegmentMatch,
  }
}

export function getScorePriority(score: number): 'ALTA' | 'MEDIA' | 'BAIXA' {
  if (score >= 80) return 'ALTA'
  if (score >= 50) return 'MEDIA'
  return 'BAIXA'
}
