/**
 * Grant Scoring Rubric Types
 *
 * Defines types for grant evaluation criteria and scoring systems
 * to enable strategic prioritization in AI-generated proposals.
 */

/**
 * Evaluation criterion with point allocation
 */
export interface ScoringCriterion {
  /** Criterion name (e.g., "Need Statement", "Project Methods") */
  name: string;

  /** Description of what reviewers evaluate */
  description: string;

  /** Maximum points possible for this criterion */
  maxPoints: number;

  /** Percentage of total score (calculated) */
  percentage?: number;

  /** Sub-criteria if criterion is broken down further */
  subCriteria?: ScoringCriterion[];

  /** What reviewers look for (keywords, themes) */
  reviewerLookFor?: string[];

  /** Common pitfalls to avoid */
  commonPitfalls?: string[];
}

/**
 * Complete grant scoring rubric
 */
export interface GrantScoringRubric {
  /** Grant or section identifier */
  grantId: string;

  /** Total possible points */
  totalPoints: number;

  /** Minimum passing score (if specified) */
  minimumPassingScore?: number;

  /** Competitive score threshold (estimated) */
  competitiveScoreThreshold?: number;

  /** All evaluation criteria */
  criteria: ScoringCriterion[];

  /** Additional scoring notes or instructions */
  scoringNotes?: string;

  /** Whether scoring is published by funder */
  isPublished: boolean;
}

/**
 * Section-level content constraints
 */
export interface ContentConstraints {
  /** Word limit (if specified) */
  wordLimit?: number;

  /** Character limit INCLUDING spaces (if specified) */
  characterLimit?: number;

  /** Character limit EXCLUDING spaces (if specified) */
  characterLimitNoSpaces?: number;

  /** Page limit (if specified) */
  pageLimit?: number;

  /** Formatting requirements */
  formatting?: {
    fontSize?: number;
    fontFamily?: string[];
    lineSpacing?: number;
    margins?: string;
  };

  /** Whether limit is hard (truncates) or soft (guidance) */
  isHardLimit: boolean;

  /** Warning threshold (e.g., 90% of limit) */
  warningThreshold?: number;
}

/**
 * Section scoring and constraints combined
 */
export interface SectionRequirements {
  /** Section identifier */
  sectionId: string;

  /** Section title */
  title: string;

  /** Content constraints */
  constraints: ContentConstraints;

  /** Scoring information for this section */
  scoring?: ScoringCriterion;

  /** Required vs optional */
  required: boolean;

  /** Strategic guidance based on scoring */
  strategicGuidance?: string;
}

/**
 * Calculate percentage of total score for each criterion
 */
export function calculateScoringPercentages(
  rubric: GrantScoringRubric
): GrantScoringRubric {
  const criteria = rubric.criteria.map(criterion => ({
    ...criterion,
    percentage: (criterion.maxPoints / rubric.totalPoints) * 100,
  }));

  return {
    ...rubric,
    criteria,
  };
}

/**
 * Get high-value sections (top scoring criteria)
 */
export function getHighValueSections(
  rubric: GrantScoringRubric,
  threshold: number = 20 // percentage
): ScoringCriterion[] {
  const withPercentages = calculateScoringPercentages(rubric);
  return withPercentages.criteria.filter(c => (c.percentage || 0) >= threshold);
}

/**
 * Prioritize sections by point value (descending)
 */
export function prioritizeSectionsByScore(
  rubric: GrantScoringRubric
): ScoringCriterion[] {
  return [...rubric.criteria].sort((a, b) => b.maxPoints - a.maxPoints);
}

/**
 * Count characters in text
 */
export function countCharacters(text: string, includeSpaces: boolean = true): number {
  if (includeSpaces) {
    return text.length;
  }
  return text.replace(/\s/g, '').length;
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}

/**
 * Check if content meets constraints
 */
export function checkContentConstraints(
  content: string,
  constraints: ContentConstraints
): {
  withinLimits: boolean;
  currentCounts: {
    words: number;
    characters: number;
    charactersNoSpaces: number;
  };
  violations: string[];
  warnings: string[];
} {
  const words = countWords(content);
  const characters = countCharacters(content, true);
  const charactersNoSpaces = countCharacters(content, false);

  const violations: string[] = [];
  const warnings: string[] = [];

  // Check word limit
  if (constraints.wordLimit && words > constraints.wordLimit) {
    if (constraints.isHardLimit) {
      violations.push(
        `Word count (${words}) exceeds hard limit of ${constraints.wordLimit}`
      );
    } else {
      warnings.push(
        `Word count (${words}) exceeds recommended limit of ${constraints.wordLimit}`
      );
    }
  }

  // Check character limit with spaces
  if (constraints.characterLimit && characters > constraints.characterLimit) {
    if (constraints.isHardLimit) {
      violations.push(
        `Character count (${characters}) exceeds hard limit of ${constraints.characterLimit}`
      );
    } else {
      warnings.push(
        `Character count (${characters}) exceeds recommended limit of ${constraints.characterLimit}`
      );
    }
  }

  // Check character limit without spaces
  if (
    constraints.characterLimitNoSpaces &&
    charactersNoSpaces > constraints.characterLimitNoSpaces
  ) {
    if (constraints.isHardLimit) {
      violations.push(
        `Character count without spaces (${charactersNoSpaces}) exceeds hard limit of ${constraints.characterLimitNoSpaces}`
      );
    } else {
      warnings.push(
        `Character count without spaces (${charactersNoSpaces}) exceeds recommended limit of ${constraints.characterLimitNoSpaces}`
      );
    }
  }

  // Check warning threshold
  if (constraints.warningThreshold) {
    if (constraints.wordLimit) {
      const wordPercentage = (words / constraints.wordLimit) * 100;
      if (
        wordPercentage >= constraints.warningThreshold &&
        wordPercentage <= 100
      ) {
        warnings.push(
          `Approaching word limit: ${words}/${constraints.wordLimit} (${wordPercentage.toFixed(0)}%)`
        );
      }
    }

    if (constraints.characterLimit) {
      const charPercentage = (characters / constraints.characterLimit) * 100;
      if (
        charPercentage >= constraints.warningThreshold &&
        charPercentage <= 100
      ) {
        warnings.push(
          `Approaching character limit: ${characters}/${constraints.characterLimit} (${charPercentage.toFixed(0)}%)`
        );
      }
    }
  }

  return {
    withinLimits: violations.length === 0,
    currentCounts: {
      words,
      characters,
      charactersNoSpaces,
    },
    violations,
    warnings,
  };
}

/**
 * Generate strategic guidance based on scoring rubric
 */
export function generateStrategicGuidance(criterion: ScoringCriterion): string {
  const percentage = criterion.percentage || 0;

  let guidance = `This section is worth ${criterion.maxPoints} points`;

  if (percentage >= 30) {
    guidance += ` (${percentage.toFixed(0)}% of total score) - **HIGH PRIORITY**. `;
    guidance += 'Invest significant effort here. This section has major impact on overall score. ';
  } else if (percentage >= 20) {
    guidance += ` (${percentage.toFixed(0)}% of total score) - **MEDIUM-HIGH PRIORITY**. `;
    guidance += 'This section significantly impacts your score. Allocate substantial attention. ';
  } else if (percentage >= 10) {
    guidance += ` (${percentage.toFixed(0)}% of total score) - **MEDIUM PRIORITY**. `;
    guidance += 'Important but not the highest priority. ';
  } else {
    guidance += ` (${percentage.toFixed(0)}% of total score) - **LOWER PRIORITY**. `;
    guidance += 'Address thoroughly but focus more effort on higher-value sections. ';
  }

  if (criterion.reviewerLookFor && criterion.reviewerLookFor.length > 0) {
    guidance += `\n\nReviewers look for: ${criterion.reviewerLookFor.join(', ')}.`;
  }

  if (criterion.commonPitfalls && criterion.commonPitfalls.length > 0) {
    guidance += `\n\nAvoid: ${criterion.commonPitfalls.join(', ')}.`;
  }

  return guidance;
}

/**
 * Create metadata for ProposalSection.metadata field
 */
export function createSectionMetadata(
  requirements: SectionRequirements
): Record<string, any> {
  return {
    constraints: requirements.constraints,
    scoring: requirements.scoring
      ? {
          maxPoints: requirements.scoring.maxPoints,
          percentage: requirements.scoring.percentage,
          description: requirements.scoring.description,
          reviewerLookFor: requirements.scoring.reviewerLookFor,
          commonPitfalls: requirements.scoring.commonPitfalls,
        }
      : null,
    strategicGuidance: requirements.strategicGuidance,
    required: requirements.required,
  };
}

/**
 * Example scoring rubric (for reference/testing)
 */
export const EXAMPLE_FEDERAL_GRANT_RUBRIC: GrantScoringRubric = {
  grantId: 'example-federal-001',
  totalPoints: 100,
  minimumPassingScore: 70,
  competitiveScoreThreshold: 85,
  isPublished: true,
  criteria: [
    {
      name: 'Need Statement',
      description: 'Demonstrates clear, compelling need for the project',
      maxPoints: 20,
      reviewerLookFor: [
        'Data-backed evidence of need',
        'Community-specific context',
        'Gap analysis',
        'Urgency clearly articulated',
      ],
      commonPitfalls: [
        'Vague or generalized claims',
        'Lack of local data',
        'No clear gap identified',
      ],
    },
    {
      name: 'Project Design and Methods',
      description: 'Clear, feasible, evidence-based approach',
      maxPoints: 35,
      reviewerLookFor: [
        'Evidence-based model',
        'Clear logic model',
        'Specific activities and timeline',
        'Feasibility demonstrated',
      ],
      commonPitfalls: [
        'Overly complex or unclear methods',
        'No evidence for approach',
        'Unrealistic timeline',
      ],
    },
    {
      name: 'Organizational Capacity',
      description: 'Demonstrates ability to successfully execute',
      maxPoints: 15,
      reviewerLookFor: [
        'Relevant experience',
        'Qualified staff',
        'Strong partnerships',
        'Financial stability',
      ],
      commonPitfalls: ['Lack of relevant experience', 'Weak team descriptions'],
    },
    {
      name: 'Evaluation Plan',
      description: 'Clear plan to measure outcomes and impact',
      maxPoints: 15,
      reviewerLookFor: [
        'Measurable outcomes',
        'Clear data collection methods',
        'Timeline for evaluation',
        'How results will be used',
      ],
      commonPitfalls: ['Vague metrics', 'No data collection plan'],
    },
    {
      name: 'Budget and Sustainability',
      description: 'Reasonable budget and plan for long-term sustainability',
      maxPoints: 15,
      reviewerLookFor: [
        'Budget aligns with activities',
        'Cost-effective',
        'Sustainability plan beyond grant',
        'Leverage or matching funds',
      ],
      commonPitfalls: [
        'Budget doesn\'t match narrative',
        'No sustainability plan',
        'Unrealistic costs',
      ],
    },
  ],
  scoringNotes:
    'Scoring is based on a 100-point scale. Proposals scoring below 70 are not competitive. Proposals scoring 85+ are highly competitive.',
};
