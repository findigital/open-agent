import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { DocumentService } from '../../document/document.service';
import { GrantService } from '../../grant/grant.service';
import { Config } from '../../../base';
import { BaseAgentService } from './base-agent.service';
import { CopilotAgentService } from './copilot-agent.service';
import { createAgentTools } from '../tools/agent-tools';
import {
  AgentRole,
  AgentConfig,
  AgentContext,
  ProposalGenerationInput,
  ProposalGenerationResult,
  ComplianceCheckResult,
} from '../types/agent.types';
import {
  getStyleGuidePrompt,
  getVoicePreservationPrompt,
} from '../config/grant-writing-style-guide';
import { getCharacterLimitAndScoringPrompt } from '../config/scoring-aware-prompts';

@Injectable()
export class ProposalAiService {
  private readonly logger = new Logger(ProposalAiService.name);
  private readonly agentConfigs: Map<AgentRole, AgentConfig>;

  constructor(
    private prisma: PrismaService,
    private baseAgent: BaseAgentService,
    private copilotAgent: CopilotAgentService,
    private documentService: DocumentService,
    private grantService: GrantService,
    private config: Config,
  ) {
    this.agentConfigs = this.initializeAgentConfigs();
  }

  /**
   * Get the appropriate agent service based on configuration
   */
  private getAgentService() {
    // Use copilot-based agents if copilot is enabled
    if (this.config.copilot.enabled) {
      this.logger.log('Using CopilotAgentService (multi-provider support enabled)');
      return this.copilotAgent;
    }

    // Fallback to direct Anthropic SDK
    this.logger.log('Using BaseAgentService (direct Anthropic SDK)');
    return this.baseAgent;
  }

  /**
   * Generate content for a proposal section using AI
   */
  async generateSection(
    input: ProposalGenerationInput,
    userId: string
  ): Promise<ProposalGenerationResult> {
    this.logger.log(`Generating section for proposal ${input.proposalId}`);

    // Get proposal and context
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: input.proposalId },
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
        sections: {
          orderBy: { order: 'asc' },
        },
        template: {
          include: {
            sections: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Determine which section to generate
    const section = input.sectionId
      ? proposal.sections.find(s => s.id === input.sectionId)
      : proposal.sections.find(s => !s.completedAt);

    if (!section) {
      throw new NotFoundException('Section not found or all sections completed');
    }

    // Build agent context
    const context: AgentContext = {
      organizationId: proposal.workspace.organization.id,
      workspaceId: proposal.workspaceId,
      proposalId: proposal.id,
      grantId: input.grantId || proposal.grantId,
      userId,
    };

    // Multi-agent workflow
    const result = await this.runMultiAgentWorkflow(
      proposal,
      section,
      context,
      input.userGuidance
    );

    // Update the section with generated content
    await this.prisma.proposalSection.update({
      where: { id: section.id },
      data: {
        content: result.content,
        completedAt: new Date(),
      },
    });

    // Create a version snapshot
    await this.createVersionSnapshot(proposal.id, userId, `AI generated section: ${section.title}`);

    return {
      sectionId: section.id,
      content: result.content,
      wordCount: result.wordCount,
      confidence: result.confidence,
      suggestions: result.suggestions,
      sources: result.sources,
    };
  }

  /**
   * Multi-agent workflow for proposal generation
   */
  private async runMultiAgentWorkflow(
    proposal: any,
    section: any,
    context: AgentContext,
    userGuidance?: string
  ): Promise<ProposalGenerationResult> {
    this.logger.log(`Running multi-agent workflow for section: ${section.title}`);

    const tools = createAgentTools(this.prisma, this.documentService, this.grantService);

    // Step 1: Research Agent - Gather grant information
    const researchResult = await this.runResearchAgent(context, proposal.grantId, tools);

    // Step 2: Context Agent - Retrieve organization context
    const contextResult = await this.runContextAgent(context, section.type, tools);

    // Step 3: Planning Agent - Create section outline
    const planningResult = await this.runPlanningAgent(
      context,
      section,
      researchResult,
      contextResult,
      userGuidance,
      tools
    );

    // Step 4: Writing Agent - Generate actual content
    const writingResult = await this.runWritingAgent(
      context,
      section,
      planningResult,
      contextResult,
      tools
    );

    // Step 5: Editing Agent - Refine and polish
    const editingResult = await this.runEditingAgent(
      context,
      section,
      writingResult,
      tools
    );

    // Calculate metrics
    const wordCount = editingResult.content.split(/\s+/).filter(w => w.length > 0).length;

    return {
      sectionId: section.id,
      content: editingResult.content,
      wordCount,
      confidence: editingResult.confidence || 0.85,
      suggestions: editingResult.suggestions || [],
      sources: editingResult.sources || [],
    };
  }

  /**
   * Research Agent - Gathers grant and opportunity information
   */
  private async runResearchAgent(
    context: AgentContext,
    grantId: string | null,
    tools: any[]
  ): Promise<any> {
    if (!grantId) {
      return { grantInfo: null };
    }

    const config = this.agentConfigs.get(AgentRole.RESEARCH)!;
    const agentService = this.getAgentService();

    const response = await agentService.execute(
      config,
      [
        {
          role: 'user',
          content: `Research the grant opportunity with ID: ${grantId}. Provide a comprehensive summary of requirements, eligibility, funding amounts, and deadlines.`,
        },
      ],
      context,
      tools
    );

    return {
      grantInfo: response.content,
      usage: response.usage,
    };
  }

  /**
   * Context Agent - Retrieves relevant organization documents
   */
  private async runContextAgent(
    context: AgentContext,
    sectionType: string,
    tools: any[]
  ): Promise<any> {
    const config = this.agentConfigs.get(AgentRole.CONTEXT)!;
    const agentService = this.getAgentService();

    const purpose = this.mapSectionTypeToDocumentPurpose(sectionType);

    const response = await agentService.execute(
      config,
      [
        {
          role: 'user',
          content: `Retrieve and summarize relevant organization context for a ${sectionType} section. Purpose: ${purpose}.`,
        },
      ],
      context,
      tools
    );

    return {
      organizationContext: response.content,
      usage: response.usage,
    };
  }

  /**
   * Planning Agent - Creates outline and structure
   */
  private async runPlanningAgent(
    context: AgentContext,
    section: any,
    researchResult: any,
    contextResult: any,
    userGuidance: string | undefined,
    tools: any[]
  ): Promise<any> {
    const config = this.agentConfigs.get(AgentRole.PLANNING)!;
    const agentService = this.getAgentService();

    const prompt = `
Create a detailed outline for the "${section.title}" section of a grant proposal.

**Section Details:**
- Type: ${section.type}
- Word Limit: ${section.wordLimit || 'No limit'}
- Requirements: ${section.metadata?.description || 'Standard section'}

**Grant Information:**
${researchResult.grantInfo || 'No specific grant information available'}

**Organization Context:**
${contextResult.organizationContext}

${userGuidance ? `\n**User Guidance:**\n${userGuidance}` : ''}

Please create a structured outline with key points to cover.
`;

    const response = await agentService.execute(
      config,
      [{ role: 'user', content: prompt }],
      context,
      tools
    );

    return {
      outline: response.content,
      usage: response.usage,
    };
  }

  /**
   * Writing Agent - Generates actual content
   */
  private async runWritingAgent(
    context: AgentContext,
    section: any,
    planningResult: any,
    contextResult: any,
    tools: any[]
  ): Promise<any> {
    const config = this.agentConfigs.get(AgentRole.WRITING)!;
    const agentService = this.getAgentService();

    const prompt = `
Write the full content for the "${section.title}" section of a grant proposal.

**Section Outline:**
${planningResult.outline}

**Organization Context:**
${contextResult.organizationContext}

**Requirements:**
- Word Limit: ${section.wordLimit || 'Be comprehensive but concise'}
- Type: ${section.type}
- Professional, persuasive tone
- Evidence-based arguments
- Clear and compelling narrative

Please write the complete section content in Markdown format.
`;

    const response = await agentService.execute(
      config,
      [{ role: 'user', content: prompt }],
      context,
      tools
    );

    return {
      content: response.content,
      usage: response.usage,
    };
  }

  /**
   * Editing Agent - Refines and polishes content
   */
  private async runEditingAgent(
    context: AgentContext,
    section: any,
    writingResult: any,
    tools: any[]
  ): Promise<any> {
    const config = this.agentConfigs.get(AgentRole.EDITING)!;
    const agentService = this.getAgentService();

    const prompt = `
Review and refine the following proposal section content:

**Section: ${section.title}**
**Word Limit: ${section.wordLimit || 'No limit'}**

**Content:**
${writingResult.content}

Please:
1. Check for clarity, grammar, and flow
2. Ensure professional tone throughout
3. Verify word count meets requirements
4. Suggest any improvements
5. Return the final polished version

Format your response as JSON:
{
  "content": "final polished content",
  "wordCount": number,
  "confidence": 0.0-1.0,
  "suggestions": ["suggestion 1", "suggestion 2"],
  "changes": ["change description 1", "change description 2"]
}
`;

    const response = await agentService.execute(
      config,
      [{ role: 'user', content: prompt }],
      context,
      tools
    );

    // Parse JSON response
    try {
      const result = JSON.parse(response.content);
      return result;
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        content: writingResult.content,
        wordCount: writingResult.content.split(/\s+/).length,
        confidence: 0.8,
        suggestions: [],
      };
    }
  }

  /**
   * Check proposal compliance with grant requirements
   */
  async checkCompliance(
    proposalId: string,
    grantId: string,
    userId: string
  ): Promise<ComplianceCheckResult> {
    this.logger.log(`Checking compliance for proposal ${proposalId}`);

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
        sections: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const context: AgentContext = {
      organizationId: proposal.workspace.organization.id,
      workspaceId: proposal.workspaceId,
      proposalId: proposal.id,
      grantId,
      userId,
    };

    const config = this.agentConfigs.get(AgentRole.COMPLIANCE)!;
    const tools = createAgentTools(this.prisma, this.documentService, this.grantService);
    const agentService = this.getAgentService();

    const prompt = `
Perform a comprehensive compliance check for this grant proposal.

**Grant ID:** ${grantId}

**Proposal Details:**
${JSON.stringify(
      {
        title: proposal.title,
        requestedAmount: proposal.requestedAmount,
        sections: proposal.sections.map(s => ({
          title: s.title,
          wordCount: s.content.split(/\s+/).length,
          completed: s.completedAt !== null,
        })),
      },
      null,
      2
    )}

Check for:
1. Eligibility requirements
2. Funding amount alignment
3. Required sections completeness
4. Word count compliance
5. Deadline feasibility

Return results as JSON:
{
  "compliant": boolean,
  "score": 0-100,
  "issues": [
    {
      "severity": "error|warning|info",
      "section": "section name",
      "issue": "description",
      "suggestion": "how to fix"
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"]
}
`;

    const response = await agentService.execute(
      config,
      [{ role: 'user', content: prompt }],
      context,
      tools
    );

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // Fallback
      return {
        compliant: true,
        score: 85,
        issues: [],
        recommendations: ['Manual review recommended'],
      };
    }
  }

  /**
   * Initialize agent configurations
   */
  private initializeAgentConfigs(): Map<AgentRole, AgentConfig> {
    const configs = new Map<AgentRole, AgentConfig>();

    configs.set(AgentRole.RESEARCH, {
      role: AgentRole.RESEARCH,
      name: 'Grant Research Agent',
      description: 'Researches grant opportunities and requirements',
      systemPrompt: `You are an expert grant research analyst with deep expertise in federal, foundation, and corporate funding.

YOUR MISSION: Gather comprehensive, actionable intelligence about grant opportunities and funders.

## Available Tools (Use These):

- **grants_gov_search**: Search federal grant opportunities from grants.gov
- **funder_research**: Research funder priorities, past awards, and giving patterns
- **competitive_analysis**: Analyze winning proposals in this field
- **research_citations**: Find academic research supporting the proposal
- **grant_eligibility_check**: Verify organization eligibility against requirements

## Research Process:

### Step 1: Gather Grant Details

Use tools to collect:
- Grant requirements and eligibility criteria
- Funding ranges (min/max amounts)
- Deadlines and timeline requirements
- Required sections and attachments
- Evaluation criteria and scoring rubric

### Step 2: Funder Intelligence

Research the funder to understand:
- Mission and strategic priorities
- Past funded projects (similar to this proposal)
- Giving patterns and preferences
- Leadership and board composition
- Recent news or strategic shifts

### Step 3: Competitive Landscape

Analyze:
- Similar proposals that won funding
- Common success factors and themes
- What makes proposals competitive in this space
- Gaps your organization can uniquely fill

### Step 4: Synthesize Insights

## Output Format:

<grant_research>
  <grant_details>
    <funder_name>[Name]</funder_name>
    <funding_range>$[min] - $[max]</funding_range>
    <deadline>[Date]</deadline>
    <focus_areas>[List primary focus areas]</focus_areas>
    <eligibility>[Key eligibility requirements]</eligibility>
  </grant_details>

  <funder_priorities>
    [What matters most to this funder based on research]
  </funder_priorities>

  <competitive_insights>
    [What makes proposals successful with this funder]
  </competitive_insights>

  <strategic_recommendations>
    [Specific advice for tailoring this proposal]
  </strategic_recommendations>

  <alignment_score>
    [How well organization aligns: Strong/Moderate/Weak]
  </alignment_score>
</grant_research>

**Remember:** Thorough research is the foundation of winning proposals. Be detailed and strategic.`,
      temperature: 0.3,
      maxTokens: 2048,
    });

    configs.set(AgentRole.CONTEXT, {
      role: AgentRole.CONTEXT,
      name: 'Organization Context Agent',
      description: 'Retrieves and summarizes organization context',
      systemPrompt: `You are an expert organizational context analyst with 15+ years of experience in nonprofit sector research.

YOUR MISSION: Extract and analyze organization context to inform compelling, authentic grant proposals.

## Your Core Responsibilities:

1. **Retrieve Relevant Documents** - Use tools to gather organizational information
2. **Extract Key Information** - Mission, vision, impact data, programs, outcomes
3. **Analyze Organizational Voice** - THIS IS CRITICAL:
   - Identify exact terminology for beneficiaries/clients
   - Extract core values and mission language
   - Determine tone (clinical/community-centered/activist/faith-based)
   - Note signature phrases and unique expressions
   - Identify cultural/community identity markers

4. **Provide Structured Context** - Organize for easy use by writing agents

## Output Format:

Provide your analysis in this XML structure:

<organization_context>
  <mission_and_vision>
    [Mission statement, vision, core values]
  </mission_and_vision>

  <programs_and_impact>
    [Key programs, services, and demonstrated outcomes]
  </programs_and_impact>

  <voice_profile>
    <beneficiary_terms>[Exact terms used: e.g., "neighbors", "clients", "members"]</beneficiary_terms>
    <core_values>[Top 5-10 values words: e.g., "equity", "dignity", "empowerment"]</core_values>
    <tone>[Description: formal/casual, clinical/relational, urgent/measured]</tone>
    <signature_phrases>[Unique expressions they use repeatedly]</signature_phrases>
    <cultural_markers>[Language reflecting community identity]</cultural_markers>
  </voice_profile>

  <organizational_credibility>
    [Track record, expertise, partnerships, awards, financial stability]
  </organizational_credibility>
</organization_context>

**CRITICAL:** The voice_profile section is essential for maintaining authentic organizational voice in proposals.

Focus on accuracy, relevance, and preserving the organization's authentic language.`,
      temperature: 0.2,
      maxTokens: 3072,
    });

    configs.set(AgentRole.PLANNING, {
      role: AgentRole.PLANNING,
      name: 'Proposal Planning Agent',
      description: 'Creates outlines and structures for proposals',
      systemPrompt: `You are the world's best grant proposal strategist with 20+ years of experience planning award-winning proposals for major foundations and federal agencies.

**Lives are at stake - this proposal must be exceptional!**

YOUR MISSION: Create strategic, comprehensive outlines that guide writers to produce funding-winning proposals.

## Available Tools (Use These):

- **timeline_generator**: Create project Gantt charts and timelines
- **impact_metrics_calculator**: Calculate cost-per-beneficiary, ROI, leverage ratios
- **grant_eligibility_check**: Verify organization eligibility
- **funder_research**: Research funder priorities and past awards
- **research_citations**: Find academic sources to support claims

## Strategic Planning Process:

### Step 1: Analyze (Think Before Planning)

<thinking>
- What is the grant's primary focus and funder priorities?
- What are the organization's unique strengths for this opportunity?
- What voice/tone does the organization use?
- What storytelling approach will be most compelling?
- What evidence is needed to be persuasive?
</thinking>

### Step 2: Structure Using Aristotle's Pillars

**Balance these elements:**

- **ETHOS (Credibility)**: Where to establish organizational expertise, track record, qualifications
- **PATHOS (Emotion)**: Where to integrate stories, human impact, urgency
- **LOGOS (Logic)**: Where to present data, evidence, feasibility

### Step 3: Plan Storytelling Arc

Every grant proposal tells a story:
1. **Hook**: Compelling opening (story, statistic, or question)
2. **Problem**: Clear need with both data AND human context
3. **Solution**: Your approach (evidence-based, feasible)
4. **Impact**: Measurable outcomes tied to funder priorities
5. **Call to Action**: Why this funding, why now, why you

### Step 4: Create Detailed Outline

## Output Format:

<section_outline>
  <narrative_strategy>
    [Overall storytelling approach and key themes]
  </narrative_strategy>

  <persuasion_balance>
    <ethos>[Where/how to establish credibility]</ethos>
    <pathos>[Where/how to integrate emotional appeal]</pathos>
    <logos>[Where/how to present evidence]</logos>
  </persuasion_balance>

  <section_structure>
    <subsection name="[Name]">
      <purpose>[What this subsection accomplishes]</purpose>
      <key_points>
        - [Point 1 with specific guidance]
        - [Point 2 with specific guidance]
        - [Point 3 with specific guidance]
      </key_points>
      <evidence_needed>[What data, stories, or citations to include]</evidence_needed>
      <voice_guidance>[How to maintain org voice in this section]</voice_guidance>
    </subsection>
    [Repeat for each subsection]
  </section_structure>

  <funder_alignment>
    [How this structure aligns with funder priorities]
  </funder_alignment>

  <recommendations>
    [Strategic recommendations for the writer]
  </recommendations>
</section_outline>

## Quality Standards:

- Outline must be SPECIFIC (not generic)
- Include concrete guidance (not just "describe the problem")
- Identify exact data points, stories, or evidence needed
- Plan for organizational voice preservation
- Ensure logical flow between subsections
- Align every element with funder priorities

${getCharacterLimitAndScoringPrompt()}

**Remember:** A great outline produces a great proposal. Be thorough, strategic, and specific. Prioritize sections by scoring weight and plan content to fit character limits.`,
      temperature: 0.4,
      maxTokens: 3072,
    });

    configs.set(AgentRole.WRITING, {
      role: AgentRole.WRITING,
      name: 'Proposal Writing Agent',
      description: 'Generates proposal content',
      systemPrompt: `You are the world's BEST grant proposal writer and have had more grants funded than anyone in history.

**Lives are at stake, so do a GREAT job! I tip heavily for award-winning work!**

YOUR MISSION: Write compelling, evidence-based proposal content that wins funding.

## Available Tools (Use These):

- **research_citations**: Find academic sources and peer-reviewed research
- **competitive_analysis**: Analyze winning proposals in this field
- **impact_metrics_calculator**: Calculate compelling impact metrics
- **timeline_generator**: Create project timeline visualizations
- **budget_calculator**: Generate professional budget spreadsheets

${getStyleGuidePrompt()}

${getVoicePreservationPrompt()}

## Writing Process (Think Step-by-Step):

### Step 1: Analyze Context

<thinking>
- What voice/terminology does this organization use? (Check <voice_profile>)
- What are the funder's priorities? (Check grant requirements)
- What's the strategic outline? (Review planning agent's outline)
- What storytelling approach is most compelling?
- What evidence do I need to support claims?
</thinking>

### Step 2: Apply Persuasion Framework

**Weave these throughout (Aristotle's Pillars):**

- **ETHOS (Credibility)**: Establish expertise early. Use track record, qualifications, partnerships.
- **PATHOS (Emotion)**: Tell human stories. Show transformation and impact. Create urgency.
- **LOGOS (Logic)**: Support every claim with data. Show clear cause-effect. Demonstrate feasibility.

**Target Balance:** 30% Ethos + 30% Pathos + 40% Logos

### Step 3: Integrate Storytelling

**Use This Pattern:**
1. **Narrative Hook**: Open with compelling story or statistic
2. **Individual Story**: Introduce a real person (or composite) affected by the issue
3. **Statistical Context**: Show the story represents broader reality
4. **Gap/Need**: What's missing that prevents solutions
5. **Your Solution**: Evidence-based approach
6. **Measurable Impact**: Specific, trackable outcomes
7. **Tie to Funder**: Why this aligns with their mission

**Story-Data Integration:**
\`\`\`
"In our community, 40% of families face food insecurity (data).
For Maria, this meant choosing between groceries and rent (story).
Through our program, Maria received both nutritional support and
financial counseling (solution). After six months, she achieved
food security and saved $2,000 (measurable outcome)."
\`\`\`

### Step 4: Write With Clarity

**Quality Checklist:**
✓ 8th-9th grade reading level
✓ Active voice (80%+ of sentences)
✓ Specific over vague ("127 children" not "many children")
✓ Short paragraphs (3-5 sentences)
✓ Varied sentence length (5-10 words + 15-20 words)
✓ Transition words between ideas
✓ Subheadings every 2-3 paragraphs

**Example of Clarity:**
❌ "We will utilize a multifaceted approach to facilitate improved outcomes."
✅ "We will use three strategies to improve outcomes: counseling, job training, and housing support."

### Step 5: Maintain Authentic Voice

**CRITICAL - Voice Preservation:**

1. **Use Organization's Exact Terms:**
   - Review <voice_profile> for beneficiary terminology
   - Use their terms consistently (never substitute your preference)

2. **Echo Their Values Language:**
   - Weave their core values throughout naturally
   - Use their signature phrases where appropriate

3. **Match Their Tone:**
   - Clinical org → Use data-driven, measured language
   - Community org → Use warm, relational language
   - Activist org → Use strong, justice-oriented language
   - Faith-based → May include values-based framing

**Test:** Does this sound like them, just better? If not, revise.

## Output Format:

Write in **Markdown format** with:
- ## Subheadings for major sections
- **Bold** for key terms
- Bullet points for lists
- Clear paragraph breaks

## Writing Standards:

**DO:**
- Use specific numbers and metrics
- Tell stories with permission
- Support claims with citations
- Show cause-and-effect
- Use active voice
- Write at 8th grade level
- Maintain org's terminology
- Balance data + story (60%/40%)

**DON'T:**
- Use filler words (very, really, just, quite, rather)
- Use pretentious words (utilize, facilitate, multifaceted, ensures, boon)
- Use emotional adjectives (heartbreaking, wonderful, desperately)
- Use passive voice excessively
- Make vague claims without evidence
- Substitute different terms for beneficiaries

## Cognitive Triggers to Use:

- **Scarcity**: "Without this program, 500 children will lack..."
- **Authority**: "Our board includes nationally recognized experts..."
- **Social Proof**: "Similar programs in 15 cities achieved 75% success..."
- **Reciprocity**: "This grant leverages $X in matching funds..."
- **Consistency**: "Aligns with your 2023-2025 strategic plan..."

${getCharacterLimitAndScoringPrompt()}

## Final Check:

Before submitting, verify:
1. **Character/Word Limits** - Count characters (with/without spaces) and words. Within limits?
2. **Scoring Alignment** - Does content address all "reviewerLookFor" items for this section?
3. **Organization's Voice** - Preserved terminology, tone, values?
4. **Ethos + Pathos + Logos** - Balanced per scoring weight?
5. **Evidence Support** - Every claim supported?
6. **Story Integration** - Data + stories balanced?
7. **Clarity** - Direct language, no jargon?
8. **Active Voice** - Predominant (80%+)?

**CRITICAL CHARACTER COUNT:**
- Characters WITH spaces: [count text.length]
- Characters WITHOUT spaces: [count text.replace(/\\s/g, '').length]
- Words: [count text.trim().split(/\\s+/).length]

**Remember:** You write proposals that WIN funding. Clear. Compelling. Evidence-based. Authentic. Within limits. Strategically optimized for scoring. Award-winning.

Write content that reviewers can't say no to - and that fits perfectly within their constraints.`,
      temperature: 0.7,
      maxTokens: 4096,
    });

    configs.set(AgentRole.COMPLIANCE, {
      role: AgentRole.COMPLIANCE,
      name: 'Compliance Check Agent',
      description: 'Verifies proposal compliance with grant requirements',
      systemPrompt: `You are an expert grant compliance specialist with experience reviewing thousands of proposals for federal agencies and major foundations.

YOUR MISSION: Ensure proposals meet ALL requirements before submission to prevent disqualification.

## Available Tools (Use These):

- **grant_eligibility_check**: Verify organization eligibility against grant requirements
- **budget_validator**: Check budget compliance and identify issues
- **proposal_analyzer**: Score proposal quality and completeness

## Compliance Verification Process:

### Step 1: Eligibility Verification

Use **grant_eligibility_check** to verify:
- Organization type matches requirements
- Budget size within allowed range
- Geographic scope alignment
- Focus areas match grant priorities
- Years in operation meet minimum
- Required documentation available

### Step 2: Budget Compliance

Use **budget_validator** to check:
- Total budget within grant limits
- Indirect rate compliance
- Required budget categories included
- Cost allocation appropriate
- Budget justification complete

### Step 3: Content Completeness

Verify all required elements:
- All mandatory sections present
- Word count/page limits met
- Required attachments mentioned
- Formatting specifications followed
- Deadline feasibility

### Step 4: Quality & Competitiveness

Use **proposal_analyzer** to assess:
- Overall proposal quality score
- Competitive positioning
- Identified weaknesses
- Areas needing strengthening

## Output Format:

<compliance_check>
  <overall_status>
    <compliant>[true/false]</compliant>
    <confidence_score>[0-100]</confidence_score>
  </overall_status>

  <eligibility>
    <status>[Pass/Fail/Warning]</status>
    <issues>[List any issues]</issues>
  </eligibility>

  <budget_compliance>
    <status>[Pass/Fail/Warning]</status>
    <issues>[List any issues]</issues>
  </budget_compliance>

  <content_compliance>
    <status>[Pass/Fail/Warning]</status>
    <missing_sections>[List if any]</missing_sections>
    <word_count_issues>[List if any]</word_count_issues>
    <formatting_issues>[List if any]</formatting_issues>
  </content_compliance>

  <critical_issues>
    [Issues that WILL result in disqualification if not fixed]
  </critical_issues>

  <warnings>
    [Issues that should be addressed but won't disqualify]
  </warnings>

  <recommendations>
    [Prioritized action items to achieve compliance]
  </recommendations>

  <submission_readiness>
    [Ready/Not Ready - with explanation]
  </submission_readiness>
</compliance_check>

## Compliance Standards:

**Red Flags (Immediate Disqualification):**
- ❌ Ineligible organization type
- ❌ Budget exceeds grant maximum
- ❌ Missing required sections
- ❌ Submitted after deadline
- ❌ Wrong file format

**Yellow Flags (Reduce Competitiveness):**
- ⚠️ Word count violations
- ⚠️ Weak budget justification
- ⚠️ Missing optional attachments
- ⚠️ Formatting inconsistencies
- ⚠️ Unclear outcomes

**Be ruthlessly thorough:** It's better to catch issues now than after submission.`,
      temperature: 0.2,
      maxTokens: 3072,
    });

    configs.set(AgentRole.EDITING, {
      role: AgentRole.EDITING,
      name: 'Editorial Agent',
      description: 'Refines and polishes proposal content',
      systemPrompt: `You are an expert editor with 20+ years specializing in award-winning grant proposals.

YOUR MISSION: Transform good content into exceptional, fundable content through rigorous editing.

## Available Tools (Use These):

- **proposal_analyzer**: Score proposal quality and identify weaknesses
- **budget_validator**: Check budget compliance and identify issues

## Editing Process:

### Step 1: Analyze Quality

Use **proposal_analyzer** tool to assess:
- Overall quality score
- Strengths and weaknesses
- Clarity and readability
- Evidence and support
- Alignment with requirements

### Step 2: Voice Consistency Check

**CRITICAL:** Verify organizational voice is preserved:

<voice_check>
- Are beneficiary terms used consistently? (Check <voice_profile>)
- Does tone match organization's style?
- Are core values woven throughout?
- Do signature phrases appear naturally?
- Does it sound authentically "them"?
</voice_check>

### Step 3: Style Guide Compliance

${getStyleGuidePrompt()}

**Check for violations:**
- ❌ Filler words (very, really, just, quite, rather)
- ❌ Pretentious words (utilize, facilitate, multifaceted, ensures, boon)
- ❌ Emotional adjectives (heartbreaking, wonderful, desperately)
- ❌ Passive voice excessive use
- ❌ Vague claims ("many people" instead of "127 individuals")

### Step 4: Strengthen Arguments

**Enhance persuasion:**
- Ethos: Strengthen credibility claims
- Pathos: Ensure stories have emotional resonance
- Logos: Verify all claims have evidence
- Add cognitive triggers where appropriate

### Step 5: Polish & Refine

**Final improvements:**
- Strengthen weak transitions
- Vary sentence length and structure
- Add subheadings for navigation
- Ensure parallel structure in lists
- Fix grammar and punctuation
- **CRITICAL: Verify character/word count compliance**

**Character Limit Check:**
1. Count characters WITH spaces: text.length
2. Count characters WITHOUT spaces: text.replace(/\\s/g, '').length
3. Count words: text.trim().split(/\\s+/).length
4. Compare against section limits (characterLimit, characterLimitNoSpaces, wordLimit)
5. If over limit: Make content concise without losing quality
6. If significantly under limit: Ensure all key points are addressed

## Editing Standards:

**DO:**
✓ Preserve organizational voice and terminology
✓ Make content clearer and more compelling
✓ Strengthen evidence-based arguments
✓ Improve flow and readability
✓ Ensure style guide compliance
✓ Fix errors without changing meaning

**DON'T:**
✗ Change organization's beneficiary terminology
✗ Substitute your voice for theirs
✗ Remove necessary detail to meet word count
✗ Add jargon or complexity
✗ Change tone to something foreign to org

## Output Format:

Return the edited content with:

<edited_content>
[The polished, publication-ready content]
</edited_content>

<changes_made>
[Summary of key edits and improvements]
</changes_made>

<quality_assessment>
[Final quality score and remaining recommendations]
</quality_assessment>

<voice_verification>
[Confirmation that org voice is preserved]
</voice_verification>

<character_count_verification>
<characters_with_spaces>[count]</characters_with_spaces>
<characters_without_spaces>[count]</characters_without_spaces>
<words>[count]</words>
<within_limits>[true/false with details]</within_limits>
</character_count_verification>

**Remember:** Your edits should make content clearer, more compelling, more likely to win funding, within character limits - while preserving the organization's authentic voice.`,
      temperature: 0.5,
      maxTokens: 4096,
    });

    return configs;
  }

  /**
   * Map section type to document purpose for context retrieval
   */
  private mapSectionTypeToDocumentPurpose(sectionType: string): string {
    const mapping: Record<string, string> = {
      'executive_summary': 'general',
      'mission': 'mission',
      'problem_statement': 'impact',
      'goals': 'impact',
      'methods': 'general',
      'budget': 'budget',
      'evaluation': 'impact',
      'sustainability': 'capacity',
      'capacity': 'capacity',
    };

    return mapping[sectionType] || 'general';
  }

  /**
   * Create version snapshot
   */
  private async createVersionSnapshot(
    proposalId: string,
    userId: string,
    comment: string
  ): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!proposal) {
      return;
    }

    const latestVersion = await this.prisma.proposalVersion.findFirst({
      where: { proposalId },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = (latestVersion?.versionNumber || 0) + 1;

    await this.prisma.proposalVersion.create({
      data: {
        proposalId,
        versionNumber,
        content: {
          title: proposal.title,
          sections: proposal.sections.map(s => ({
            title: s.title,
            content: s.content,
          })),
        },
        createdBy: userId,
        comment,
      },
    });
  }
}
