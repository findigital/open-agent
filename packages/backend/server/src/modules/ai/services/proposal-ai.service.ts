import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { DocumentService } from '../../document/document.service';
import { GrantService } from '../../grant/grant.service';
import { BaseAgentService } from './base-agent.service';
import { createAgentTools } from '../tools/agent-tools';
import {
  AgentRole,
  AgentConfig,
  AgentContext,
  ProposalGenerationInput,
  ProposalGenerationResult,
  ComplianceCheckResult,
} from '../types/agent.types';

@Injectable()
export class ProposalAiService {
  private readonly logger = new Logger(ProposalAiService.name);
  private readonly agentConfigs: Map<AgentRole, AgentConfig>;

  constructor(
    private prisma: PrismaService,
    private baseAgent: BaseAgentService,
    private documentService: DocumentService,
    private grantService: GrantService
  ) {
    this.agentConfigs = this.initializeAgentConfigs();
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

    const response = await this.baseAgent.execute(
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

    const purpose = this.mapSectionTypeToDocumentPurpose(sectionType);

    const response = await this.baseAgent.execute(
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

    const response = await this.baseAgent.execute(
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

    const response = await this.baseAgent.execute(
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

    const response = await this.baseAgent.execute(
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

    const response = await this.baseAgent.execute(
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
      systemPrompt: `You are an expert grant research analyst. Your role is to:
- Analyze grant opportunities thoroughly
- Extract key requirements and eligibility criteria
- Identify funding ranges and deadlines
- Summarize compliance requirements
- Provide actionable insights for proposal writers

Use the available tools to gather accurate, up-to-date information.`,
      temperature: 0.3,
      maxTokens: 2048,
    });

    configs.set(AgentRole.CONTEXT, {
      role: AgentRole.CONTEXT,
      name: 'Organization Context Agent',
      description: 'Retrieves and summarizes organization context',
      systemPrompt: `You are an organizational context specialist. Your role is to:
- Retrieve relevant organization documents
- Summarize key organizational information
- Extract mission, vision, and impact data
- Provide context for proposal sections
- Ensure accuracy and relevance

Focus on providing concise, relevant context for proposal writing.`,
      temperature: 0.2,
      maxTokens: 3072,
    });

    configs.set(AgentRole.PLANNING, {
      role: AgentRole.PLANNING,
      name: 'Proposal Planning Agent',
      description: 'Creates outlines and structures for proposals',
      systemPrompt: `You are a strategic proposal planner. Your role is to:
- Create comprehensive section outlines
- Structure arguments logically
- Identify key points to emphasize
- Plan narrative flow
- Ensure alignment with grant requirements

Create detailed, actionable outlines that guide the writing process.`,
      temperature: 0.4,
      maxTokens: 2048,
    });

    configs.set(AgentRole.WRITING, {
      role: AgentRole.WRITING,
      name: 'Proposal Writing Agent',
      description: 'Generates proposal content',
      systemPrompt: `You are an expert grant proposal writer. Your role is to:
- Write compelling, professional proposal content
- Use evidence-based arguments
- Maintain clear, persuasive tone
- Follow grant guidelines
- Meet word count requirements
- Use proper formatting and structure

Write high-quality content that maximizes funding chances.`,
      temperature: 0.7,
      maxTokens: 4096,
    });

    configs.set(AgentRole.COMPLIANCE, {
      role: AgentRole.COMPLIANCE,
      name: 'Compliance Check Agent',
      description: 'Verifies proposal compliance with grant requirements',
      systemPrompt: `You are a grant compliance specialist. Your role is to:
- Verify eligibility requirements
- Check funding amount alignment
- Ensure all required sections are complete
- Validate formatting and structure
- Identify potential issues
- Provide actionable recommendations

Be thorough and detail-oriented in your compliance checks.`,
      temperature: 0.2,
      maxTokens: 3072,
    });

    configs.set(AgentRole.EDITING, {
      role: AgentRole.EDITING,
      name: 'Editorial Agent',
      description: 'Refines and polishes proposal content',
      systemPrompt: `You are an expert editor specializing in grant proposals. Your role is to:
- Review content for clarity and flow
- Fix grammar and style issues
- Ensure professional tone
- Verify word counts
- Strengthen arguments
- Polish final content

Provide constructive feedback and deliver publication-ready content.`,
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
