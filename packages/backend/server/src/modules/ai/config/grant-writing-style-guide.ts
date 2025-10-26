/**
 * Grant Writing Style Guide
 *
 * Comprehensive style guide for AI-generated grant proposals
 * Based on award-winning grant writing best practices (2024-2025)
 */

export interface StyleGuideConfig {
  wordsToAvoid: {
    filler: string[];
    pretentious: string[];
    emotional: string[];
    passive: string[];
  };
  replacements: Record<string, string[]>;
  toneGuidelines: {
    voice: string;
    readingLevel: string;
    sentenceStructure: string[];
    paragraphGuidelines: string[];
  };
  persuasionPrinciples: {
    ethos: string[];
    pathos: string[];
    logos: string[];
  };
  storytellingPatterns: {
    narrativeHook: string;
    personalAnecdote: string;
    dataStoryIntegration: string;
  };
}

/**
 * Core Style Guide Configuration
 */
export const GRANT_WRITING_STYLE_GUIDE: StyleGuideConfig = {
  /**
   * Words to Avoid - These diminish credibility and clarity
   */
  wordsToAvoid: {
    filler: [
      'very',
      'really',
      'just',
      'totally',
      'basically',
      'actually',
      'quite',
      'rather',
      'somewhat',
      'fairly',
      'pretty', // as intensifier
    ],
    pretentious: [
      'multifaceted',
      'reshaping',
      'ensures',
      'boon',
      'utilize',
      'implement',
      'facilitate',
      'endeavor',
      'leverage', // unless referring to actual funding leverage
    ],
    emotional: [
      'heartbreaking',
      'wonderful',
      'amazing',
      'desperately',
      'tragic',
      'terrible',
    ],
    passive: [
      'will be provided',
      'are expected',
      'is believed',
      'can be seen',
      'was determined',
    ],
  },

  /**
   * Preferred Replacements
   */
  replacements: {
    utilize: ['use'],
    implement: ['start', 'launch', 'begin', 'establish'],
    facilitate: ['help', 'enable', 'support', 'assist'],
    multifaceted: ['complex', 'diverse', 'comprehensive'],
    ensures: ['provides', 'guarantees', 'delivers'],
    boon: ['benefit', 'advantage', 'asset'],
    reshaping: ['changing', 'transforming', 'improving'],
    endeavor: ['effort', 'project', 'initiative', 'program'],
    'many people': ['[specific number] individuals'],
    'significant impact': ['[specific metric] improvement'],
    'various services': ['[list specific services]'],
    heartbreaking: ['critical', 'urgent', 'pressing'],
    wonderful: ['effective', 'successful', 'proven'],
    desperately: ['urgently', 'critically'],
  },

  /**
   * Tone and Style Guidelines
   */
  toneGuidelines: {
    voice: 'Active voice 80%+. Use "we will" not "services will be provided."',
    readingLevel: '8th-9th grade (newspaper article standard) - clear and accessible',
    sentenceStructure: [
      'Vary sentence length: mix short (5-10 words) and medium (15-20 words)',
      'Avoid sentences over 25 words',
      'Use transition words for flow: however, therefore, additionally, furthermore',
      'Lead with strong subject-verb combinations',
    ],
    paragraphGuidelines: [
      'Keep paragraphs 3-5 sentences',
      'One main idea per paragraph',
      'Use topic sentences',
      'Include transition sentences between paragraphs',
      'Use bullet points for lists of 3+ items',
      'Add subheadings every 2-3 paragraphs for navigation',
    ],
  },

  /**
   * Persuasion Principles (Aristotle's Pillars)
   */
  persuasionPrinciples: {
    ethos: [
      'Organizational track record and credibility',
      'Qualified staff and expertise',
      'Financial stability and sustainability',
      'Past success metrics and outcomes',
      'Third-party validation (awards, partnerships, accreditation)',
      'Board composition and leadership',
    ],
    pathos: [
      'Individual beneficiary stories (with permission)',
      'Community impact and transformation',
      'Urgency of need with human context',
      'Visual imagery through descriptive language',
      'Connection to funder\'s mission and values',
      'Transformative potential and hope',
    ],
    logos: [
      'Clear problem statement with evidence',
      'Data-backed need assessment',
      'Logical methodology and approach',
      'Measurable, achievable outcomes',
      'Realistic budget with justification',
      'Evidence of feasibility (pilot data, similar programs)',
      'Clear cause-and-effect relationships',
    ],
  },

  /**
   * Storytelling Patterns
   */
  storytellingPatterns: {
    narrativeHook:
      'Open with a compelling story, statistic, or question that captures attention immediately.',
    personalAnecdote: `
Pattern:
1. Meet [Name], a [demographic] who [faced challenge]
2. Before our program: [negative outcome/situation]
3. During participation: [intervention and process]
4. After completion: [transformation and success]
5. Today: [current state and future trajectory]
6. Impact: This is what your funding will multiply

Guidelines:
- Use real stories (with permission) or composite narratives
- Include specific, sensory details
- Show don't just tell
- Connect individual story to broader impact
- Always tie back to measurable outcomes
`,
    dataStoryIntegration: `
Pattern:
1. [Statistic/Data] → "In our community, 40% of families..."
2. [Human Context] → "For Maria, this means..."
3. [Personal Story] → "Maria came to our program after..."
4. [Program Response] → "Through our intervention, Maria..."
5. [Measurable Outcome] → "After 6 months, Maria achieved..."
6. [Scale] → "With this grant, we will help 150 individuals like Maria..."

Balance: 60% data/evidence + 40% story/human element
`,
  },
};

/**
 * Cognitive Triggers for Persuasive Writing
 */
export const COGNITIVE_TRIGGERS = {
  scarcity: {
    description: 'Emphasize limited time or resources',
    examples: [
      'Without this program, 500 children will lack access to...',
      'Only 30% of eligible families currently receive...',
      'This window of opportunity closes when...',
    ],
  },
  authority: {
    description: 'Demonstrate expertise and credibility',
    examples: [
      'Our board includes three nationally recognized experts in...',
      'Our evidence-based model has been validated by...',
      'We are certified by [authoritative body] for...',
    ],
  },
  socialProof: {
    description: 'Show others have succeeded with similar approaches',
    examples: [
      'Similar programs in 15 cities have achieved 75% success rates...',
      'Over 1,000 organizations nationwide use this model...',
      'Peer-reviewed research demonstrates...',
    ],
  },
  reciprocity: {
    description: 'Show how grant investment multiplies',
    examples: [
      'This grant will leverage $X in matching funds from...',
      'Every $1 invested generates $3 in economic benefit...',
      'Your investment will attract additional funding from...',
    ],
  },
  consistency: {
    description: 'Align with funder\'s past decisions and mission',
    examples: [
      'This aligns with your foundation\'s 2023-2025 strategic plan to...',
      'Similar to your investment in [past grantee]...',
      'Supporting your stated priority of...',
    ],
  },
};

/**
 * Quality Checklist for Generated Content
 */
export const QUALITY_CHECKLIST = {
  clarity: [
    'Written at 8th-9th grade reading level',
    'No jargon without definition',
    'Clear subject-verb-object structure',
    'Specific examples replace vague language',
  ],
  evidence: [
    'All claims supported by data or citations',
    'Statistics from credible sources',
    'Success metrics are measurable and specific',
    'Feasibility demonstrated with evidence',
  ],
  persuasion: [
    'Ethos (credibility) established early',
    'Pathos (emotion) through stories, not adjectives',
    'Logos (logic) with clear cause-effect',
    'Cognitive triggers used appropriately',
  ],
  compliance: [
    'Funder\'s terminology used consistently',
    'Word count within limits',
    'All required sections addressed',
    'Formatting matches guidelines',
  ],
  voice: [
    'Organization\'s terminology preserved',
    'Tone matches organizational style',
    'Beneficiary terms used correctly',
    'Core values language integrated',
  ],
};

/**
 * Get style guide as formatted text for AI prompts
 */
export function getStyleGuidePrompt(): string {
  return `
## GRANT WRITING STYLE GUIDE

### Words to AVOID (diminish credibility):

**Filler Words (remove):**
${GRANT_WRITING_STYLE_GUIDE.wordsToAvoid.filler.join(', ')}

**Pretentious Words (replace with simpler alternatives):**
${GRANT_WRITING_STYLE_GUIDE.wordsToAvoid.pretentious.join(', ')}

**Overly Emotional (balance with data):**
${GRANT_WRITING_STYLE_GUIDE.wordsToAvoid.emotional.join(', ')}

### Tone Requirements:

- **Voice:** ${GRANT_WRITING_STYLE_GUIDE.toneGuidelines.voice}
- **Reading Level:** ${GRANT_WRITING_STYLE_GUIDE.toneGuidelines.readingLevel}
- **Tone:** Formal but accessible, confident but not arrogant, urgent but not desperate

### Persuasion Balance (Aristotle's Pillars):

**Ethos (Credibility):** Establish organizational expertise and track record
**Pathos (Emotion):** Use stories and human impact, not emotional adjectives
**Logos (Logic):** Provide evidence, data, and clear cause-effect relationships

### Quality Standards:

✓ Specific over vague ("127 individuals" not "many people")
✓ Active over passive voice ("We will provide" not "Will be provided")
✓ Data + Story balance (60% evidence + 40% human element)
✓ Short paragraphs (3-5 sentences)
✓ Varied sentence length (mix 5-10 and 15-20 word sentences)

### Storytelling Pattern:

Individual Story → Statistical Context → Gap/Need →
Your Solution → Evidence of Feasibility → Measurable Impact

Remember: Clear, direct, evidence-based writing wins grants.
Avoid flourish; prioritize clarity.
`;
}

/**
 * Get organizational voice preservation instructions
 */
export function getVoicePreservationPrompt(): string {
  return `
## ORGANIZATIONAL VOICE PRESERVATION

**CRITICAL REQUIREMENT:** Mirror the organization's authentic voice and terminology while elevating quality.

### What to Preserve:

1. **Client/Beneficiary Terminology**
   - Use their EXACT terms (clients vs. patients vs. members vs. neighbors)
   - Never substitute with your preferred terminology
   - Be consistent throughout all content

2. **Mission Language**
   - Echo their core values language naturally
   - Use their characteristic approach descriptors
   - Incorporate their signature phrases

3. **Tone & Personality**
   - Match their characteristic voice (activist/clinical/community-centered/faith-based)
   - Maintain their level of formality
   - Preserve their cultural identity markers

### Process:

**BEFORE WRITING:**
1. Review organization documents for voice analysis
2. Extract: client terms, core values, tone, signature phrases
3. Create a VOICE PROFILE to reference

**WHILE WRITING:**
1. Use organization's exact beneficiary terminology
2. Weave in their values language naturally
3. Match their tone while elevating quality
4. Incorporate their phrases where appropriate

**VALIDATION:**
Final content should feel authentically "them" - just better.

**Balance:** Sound like them, but better. Preserve authenticity while achieving grant writing excellence.
`;
}
