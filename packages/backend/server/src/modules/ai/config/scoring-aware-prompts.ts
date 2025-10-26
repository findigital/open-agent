/**
 * Scoring-Aware Prompt Enhancements
 *
 * Additional prompt content for AI agents to use scoring rubrics strategically
 * and enforce character/word limits.
 */

/**
 * Get prompt content for character/word limit enforcement
 */
export function getContentLimitEnforcementPrompt(): string {
  return `
## CRITICAL: Content Length Limits

Many grants have **CHARACTER LIMITS** (not just word limits). Exceeding limits results in:
- ❌ **Automatic truncation** (your content gets cut off mid-sentence)
- ❌ **Disqualification** (application rejected)
- ❌ **Poor reviewer experience** (content doesn't fit format)

### Character Limit Types:

1. **With Spaces**: Total characters including spaces (most common)
2. **Without Spaces**: Only counts letters, numbers, punctuation
3. **Word Limits**: Number of words (less common in federal grants)

### Enforcement Rules:

**BEFORE WRITING:**
- Check section metadata for: characterLimit, characterLimitNoSpaces, wordLimit
- Note whether limit is HARD (truncates) or SOFT (guidance)
- Plan content to fit within 95% of limit (safety margin)

**WHILE WRITING:**
- Track character count continuously
- If approaching limit, prioritize high-value content
- Remove filler words and redundancy
- Use concise, direct language

**AFTER WRITING:**
- Count characters INCLUDING spaces: text.length
- Count characters EXCLUDING spaces: text.replace(/\\s/g, '').length
- Count words: text.trim().split(/\\s+/).length
- Verify all limits met

### Example Limits:

Federal grants often have strict character limits:
- Short answer: 500-1,000 characters
- Need statement: 2,000-3,000 characters
- Methods: 4,000-6,000 characters
- Full narrative: 10,000-15,000 characters

**Strategy for Tight Limits:**
- Lead with most important information
- Use bullet points (saves characters)
- Eliminate adjectives and adverbs
- One idea per sentence
- No throat-clearing introductions

**Example: 500 Character Limit**

❌ BAD (522 characters):
"Our organization is deeply committed to addressing the very important and pressing issue of food insecurity in our community. We have observed through various studies and community feedback that many families are struggling significantly to access healthy, nutritious food on a regular basis. This has led to negative health outcomes and educational challenges for children in our service area. We believe that with the right resources and support, we can make a real difference."

✅ GOOD (489 characters):
"In our community, 42% of families face food insecurity (County Health Dept, 2024). This results in childhood malnutrition (35% above state average), poor academic performance (20% lower test scores), and chronic health issues. Current food pantries serve only 8,000 of 25,000 eligible families. Our program will close this gap by: 1) Mobile food distribution to underserved areas, 2) Nutrition education, 3) Connection to SNAP benefits. We've successfully served 3,000 families since 2020."

**Notice the difference:**
- Specific data replaces vague claims
- Numbers quantify the problem and solution
- Past success demonstrates capacity
- No filler words or redundancy
- Fits within limit with room to spare
`;
}

/**
 * Get prompt content for scoring rubric strategy
 */
export function getScoringRubricStrategyPrompt(): string {
  return `
## CRITICAL: Strategic Use of Scoring Rubrics

Most grants publish their scoring criteria. **Winning proposals align content with point allocation.**

### Why Scoring Matters:

If a section is worth 35% of total points, invest 35% of your effort there.
If a section is worth 10% of total points, don't over-invest time.

### Scoring Information:

Check section metadata for:
\`\`\`json
{
  "scoring": {
    "maxPoints": 35,
    "percentage": 35,
    "description": "Clear, feasible, evidence-based approach",
    "reviewerLookFor": ["Evidence-based model", "Clear logic model", "Specific activities"],
    "commonPitfalls": ["Overly complex methods", "No evidence for approach"]
  }
}
\`\`\`

### Strategic Prioritization:

**HIGH PRIORITY (≥30% of score):**
- Invest maximum effort
- Most detailed, well-supported content
- Multiple examples and evidence
- Exceptional quality required
- This section wins or loses the grant

**MEDIUM-HIGH PRIORITY (20-29% of score):**
- Substantial attention required
- Strong evidence and examples
- Professional quality
- Significantly impacts overall score

**MEDIUM PRIORITY (10-19% of score):**
- Important but not decisive
- Solid, professional content
- Adequate support and examples
- Don't skimp, but focus more on higher-value sections

**LOWER PRIORITY (<10% of score):**
- Address thoroughly but efficiently
- Clear, professional content
- Don't over-elaborate
- Allocate more time to higher-value sections

### What Reviewers Look For:

Each criterion lists what reviewers want to see. **DIRECTLY ADDRESS THESE.**

Example:
\`\`\`
"reviewerLookFor": [
  "Evidence-based model",
  "Clear logic model",
  "Specific activities and timeline",
  "Feasibility demonstrated"
]
\`\`\`

**Your content MUST explicitly show:**
✓ "Our evidence-based model is grounded in..." (addresses "evidence-based model")
✓ "Our logic model shows..." (addresses "clear logic model")
✓ "Specific activities include: Month 1-3: ..., Month 4-6: ..." (addresses "specific activities and timeline")
✓ "Feasibility is demonstrated by our track record of..." (addresses "feasibility demonstrated")

### Common Pitfalls to Avoid:

Each criterion lists common mistakes. **AVOID THESE.**

Example:
\`\`\`
"commonPitfalls": [
  "Overly complex or unclear methods",
  "No evidence for approach",
  "Unrealistic timeline"
]
\`\`\`

**Ensure your content:**
✗ Is NOT overly complex - use clear, straightforward language
✗ HAS evidence - cite research, data, or past success
✗ Has REALISTIC timeline - feasible given resources and scope

### Example: Using Scoring Strategically

**Scenario:**
- Need Statement: 20 points (20%)
- Methods: 35 points (35%)
- Evaluation: 15 points (15%)
- Budget: 15 points (15%)
- Capacity: 15 points (15%)

**Strategic Approach:**

1. **Methods (35 points) - HIGHEST PRIORITY**
   - Most detailed section
   - Multiple evidence sources
   - Clear logic model diagram
   - Detailed timeline
   - Specific, measurable activities
   - Past success evidence
   - → Aim for 33-35/35 points

2. **Need Statement (20 points) - HIGH PRIORITY**
   - Strong data and evidence
   - Local + national context
   - Clear gap analysis
   - Compelling stories
   - → Aim for 18-20/20 points

3. **Evaluation, Budget, Capacity (15 points each) - MEDIUM PRIORITY**
   - Solid, professional content
   - All required elements
   - Clear and specific
   - → Aim for 13-15/15 points each

**Result:** Focus on Methods and Need = 55% of total score. Win these, and you're highly competitive even if other sections are just "good."

### Implementation in Your Writing:

**BEFORE outlining:**
1. Review scoring rubric for this grant
2. Identify highest-value sections
3. Allocate planning time proportionally

**WHILE writing:**
1. Check "reviewerLookFor" for this section
2. Address EACH item explicitly
3. Avoid EACH item in "commonPitfalls"
4. Match content depth to point value

**AFTER writing:**
1. Verify each "reviewerLookFor" item addressed
2. Confirm no "commonPitfalls" present
3. Ensure highest-value sections are strongest
`;
}

/**
 * Get combined prompt for both character limits and scoring
 */
export function getCharacterLimitAndScoringPrompt(): string {
  return `
${getContentLimitEnforcementPrompt()}

${getScoringRubricStrategyPrompt()}

## Balancing Scoring and Character Limits:

When a high-value section has a tight character limit:
1. **Prioritize by scoring** - Invest time crafting perfect content
2. **Be ruthlessly concise** - Every character must add value
3. **Lead with highest impact** - Most important content first
4. **Use data over prose** - Numbers are concise and compelling
5. **Eliminate all filler** - No room for fluff in high-value, limited-character sections

**Example: Methods section worth 35 points with 4,000 character limit:**
- This is HIGH PRIORITY but TIGHT CONSTRAINT
- Every sentence must directly address "reviewerLookFor" items
- Use bullet points to save characters
- Include only essential evidence
- Prioritize: What's most important for 35 points?
  1. Evidence-based approach (cite research, 200 chars)
  2. Clear activities (specific, measurable, 800 chars)
  3. Timeline (detailed but concise, 400 chars)
  4. Feasibility (track record, 300 chars)
  5. Logic model (describe visually if possible, 200 chars)
  6. Supporting details (remaining characters)

**This strategic approach wins grants:**
✓ High-value sections get proportional attention
✓ Content fits within strict limits
✓ Reviewers see exactly what they're looking for
✓ No common pitfalls
✓ Maximum points achieved
`;
}
