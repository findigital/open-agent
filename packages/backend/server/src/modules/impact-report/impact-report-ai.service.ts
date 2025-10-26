import { Injectable, Logger } from '@nestjs/common';
import { BaseAgentService } from '../ai/services/base-agent.service';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
} from '../ai/types/agent.types';

/**
 * ImpactReportAiService
 *
 * Handles AI-powered enhancements for impact reports using Claude.
 * Provides narrative improvement, writing suggestions, and executive summaries.
 */
@Injectable()
export class ImpactReportAiService {
  private readonly logger = new Logger(ImpactReportAiService.name);

  constructor(private readonly baseAgent: BaseAgentService) {}

  /**
   * Enhance a narrative section using Claude
   */
  async enhanceNarrative(input: {
    section: 'challenges' | 'successes' | 'storiesOfImpact' | 'lessonsLearned';
    currentText: string;
    reportContext: {
      awardTitle: string;
      peopleServed?: number;
      programsDelivered?: number;
      periodStart: Date;
      periodEnd: Date;
    };
    organizationContext: {
      name: string;
      mission?: string;
    };
  }): Promise<{ enhancedText: string; suggestions: string[] }> {
    this.logger.log(`Enhancing ${input.section} section with Claude`);

    const config: AgentConfig = {
      name: 'Impact Narrative Enhancer',
      role: 'proposal_writer',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2048,
    };

    const context: AgentContext = {
      organizationId: '', // Not needed for this use case
      workspaceId: '',
      proposalId: '',
    };

    const sectionGuidance = this.getSectionGuidance(input.section);
    const prompt = this.buildEnhancementPrompt(input, sectionGuidance);

    const messages: AgentMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.baseAgent.execute(config, messages, context);

      // Parse the response to extract enhanced text and suggestions
      const parsed = this.parseEnhancementResponse(response.content);

      return parsed;
    } catch (error) {
      this.logger.error('Failed to enhance narrative with Claude:', error);
      throw new Error('AI enhancement is currently unavailable');
    }
  }

  /**
   * Generate an executive summary using Claude
   */
  async generateExecutiveSummary(input: {
    awardTitle: string;
    periodStart: Date;
    periodEnd: Date;
    peopleServed?: number;
    programsDelivered?: number;
    outcomesAchieved?: any;
    challenges?: string;
    successes?: string;
    storiesOfImpact?: string;
    lessonsLearned?: string;
    organizationName: string;
  }): Promise<string> {
    this.logger.log('Generating executive summary with Claude');

    const config: AgentConfig = {
      name: 'Impact Report Summarizer',
      role: 'proposal_writer',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 1024,
    };

    const context: AgentContext = {
      organizationId: '',
      workspaceId: '',
      proposalId: '',
    };

    const prompt = this.buildSummaryPrompt(input);

    const messages: AgentMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.baseAgent.execute(config, messages, context);
      return response.content.trim();
    } catch (error) {
      this.logger.error('Failed to generate summary with Claude:', error);
      throw new Error('AI summary generation is currently unavailable');
    }
  }

  /**
   * Generate context-aware writing suggestions
   */
  async generateWritingSuggestions(input: {
    section: 'challenges' | 'successes' | 'storiesOfImpact' | 'lessonsLearned';
    currentText: string;
    wordCount: number;
  }): Promise<string[]> {
    const suggestions: string[] = [];

    const hasNumbers = /\d+/.test(input.currentText);
    const hasQuotes = /["']/.test(input.currentText);

    switch (input.section) {
      case 'challenges':
        if (input.wordCount < 50) {
          suggestions.push(
            '💡 Consider expanding on the challenges faced and how you addressed them (aim for 100+ words)'
          );
        }
        if (!hasNumbers) {
          suggestions.push(
            '📊 Include specific data or metrics to quantify the challenges'
          );
        }
        suggestions.push(
          '✍️ Structure: Describe the challenge → Your response → Outcome'
        );
        suggestions.push(
          '🎯 Focus on challenges that demonstrate resilience and problem-solving'
        );
        break;

      case 'successes':
        if (input.wordCount < 50) {
          suggestions.push(
            '💡 Provide more detail about your achievements and their significance (aim for 100+ words)'
          );
        }
        if (!hasNumbers) {
          suggestions.push(
            '📊 Add quantitative results to demonstrate measurable impact'
          );
        }
        suggestions.push(
          '🔗 Connect successes directly to your original grant objectives'
        );
        suggestions.push(
          '📈 Highlight outcomes that exceed initial expectations'
        );
        break;

      case 'storiesOfImpact':
        if (input.wordCount < 100) {
          suggestions.push(
            '💡 Impact stories work best with specific examples and personal narratives (aim for 150+ words)'
          );
        }
        if (!hasQuotes) {
          suggestions.push(
            '💬 Consider including direct quotes from beneficiaries or stakeholders'
          );
        }
        suggestions.push(
          '📖 Use the "before and after" framework to show transformation'
        );
        suggestions.push(
          '🎭 Include demographic or contextual details to make stories relatable'
        );
        suggestions.push(
          '❤️ Focus on human impact - how lives were changed or improved'
        );
        break;

      case 'lessonsLearned':
        if (input.wordCount < 50) {
          suggestions.push(
            '💡 Elaborate on key insights and how they\'ll inform future work (aim for 100+ words)'
          );
        }
        suggestions.push(
          '🔍 Be honest about what didn\'t work as well as successes'
        );
        suggestions.push(
          '🚀 Describe how lessons will be applied to improve future programs'
        );
        suggestions.push(
          '🤝 Consider sharing insights that could benefit other organizations'
        );
        break;
    }

    return suggestions;
  }

  /**
   * Build the enhancement prompt for Claude
   */
  private buildEnhancementPrompt(
    input: {
      section: string;
      currentText: string;
      reportContext: any;
      organizationContext: any;
    },
    guidance: string
  ): string {
    return `You are an expert grant writer helping ${input.organizationContext.name} enhance their impact report.

**Report Context:**
- Program: ${input.reportContext.awardTitle}
- Period: ${this.formatDate(input.reportContext.periodStart)} - ${this.formatDate(input.reportContext.periodEnd)}
- People Served: ${input.reportContext.peopleServed || 'Not specified'}
- Programs Delivered: ${input.reportContext.programsDelivered || 'Not specified'}

**Section:** ${input.section}

**Current Text:**
${input.currentText}

**Your Task:**
${guidance}

Please provide your response in the following format:

ENHANCED TEXT:
[Your improved version of the text]

SUGGESTIONS:
- [Specific suggestion 1]
- [Specific suggestion 2]
- [Specific suggestion 3]

Focus on:
1. Maintaining all factual information from the original
2. Improving clarity, flow, and impact
3. Adding structure and compelling narrative
4. Making it more data-driven and specific
5. Ensuring it resonates with funders

Keep the tone professional yet warm, and emphasize measurable outcomes.`;
  }

  /**
   * Build the summary prompt for Claude
   */
  private buildSummaryPrompt(input: {
    awardTitle: string;
    periodStart: Date;
    periodEnd: Date;
    peopleServed?: number;
    programsDelivered?: number;
    outcomesAchieved?: any;
    challenges?: string;
    successes?: string;
    storiesOfImpact?: string;
    lessonsLearned?: string;
    organizationName: string;
  }): string {
    return `You are an expert grant writer creating an executive summary for an impact report.

**Organization:** ${input.organizationName}
**Program:** ${input.awardTitle}
**Reporting Period:** ${this.formatDate(input.periodStart)} - ${this.formatDate(input.periodEnd)}

**Key Metrics:**
${input.peopleServed ? `- People Served: ${input.peopleServed}` : ''}
${input.programsDelivered ? `- Programs Delivered: ${input.programsDelivered}` : ''}
${input.outcomesAchieved ? `- Outcomes: ${JSON.stringify(input.outcomesAchieved)}` : ''}

**Challenges:**
${input.challenges || 'Not provided'}

**Successes:**
${input.successes || 'Not provided'}

**Impact Stories:**
${input.storiesOfImpact || 'Not provided'}

**Lessons Learned:**
${input.lessonsLearned || 'Not provided'}

**Your Task:**
Create a compelling executive summary (3-4 paragraphs, approximately 200-250 words) that:
1. Opens with the program's impact and significance
2. Highlights key quantitative outcomes and achievements
3. Includes a compelling impact story or testimonial element
4. Demonstrates value to the funder and community
5. Ends with forward-looking insights

Write in a professional yet engaging tone. Make it compelling enough that a busy program officer will want to read the full report.`;
  }

  /**
   * Get section-specific guidance
   */
  private getSectionGuidance(
    section: 'challenges' | 'successes' | 'storiesOfImpact' | 'lessonsLearned'
  ): string {
    const guidance = {
      challenges: `Enhance this "Challenges" section by:
- Providing clear context for each challenge
- Describing specific strategies used to address challenges
- Including quantitative data where possible
- Demonstrating problem-solving and resilience
- Ending with positive outcomes or learnings`,

      successes: `Enhance this "Successes" section by:
- Leading with the most impactful achievements
- Including specific metrics and data points
- Connecting achievements to grant objectives
- Highlighting outcomes that exceeded expectations
- Using strong, active language`,

      storiesOfImpact: `Enhance this "Impact Stories" section by:
- Opening with a compelling hook
- Using the "before and after" narrative structure
- Including specific details that make the story relatable
- Adding direct quotes if possible
- Showing transformation and human impact
- Connecting the story to broader program outcomes`,

      lessonsLearned: `Enhance this "Lessons Learned" section by:
- Being honest and reflective
- Describing both successes and areas for improvement
- Explaining how insights will inform future work
- Demonstrating organizational learning and growth
- Providing actionable takeaways`,
    };

    return guidance[section];
  }

  /**
   * Parse Claude's response to extract enhanced text and suggestions
   */
  private parseEnhancementResponse(content: string): {
    enhancedText: string;
    suggestions: string[];
  } {
    // Split by the "ENHANCED TEXT:" and "SUGGESTIONS:" markers
    const enhancedMatch = content.match(/ENHANCED TEXT:\s*([\s\S]*?)(?=SUGGESTIONS:|$)/i);
    const suggestionsMatch = content.match(/SUGGESTIONS:\s*([\s\S]*?)$/i);

    const enhancedText = enhancedMatch
      ? enhancedMatch[1].trim()
      : content; // Fallback to full content if parsing fails

    const suggestions: string[] = [];
    if (suggestionsMatch) {
      const suggestionsText = suggestionsMatch[1];
      // Extract bullet points
      const bulletPoints = suggestionsText.match(/^[\s]*[-•]\s*(.+)$/gm);
      if (bulletPoints) {
        suggestions.push(...bulletPoints.map(s => s.replace(/^[\s]*[-•]\s*/, '').trim()));
      }
    }

    return {
      enhancedText,
      suggestions: suggestions.length > 0 ? suggestions : [
        'Review for clarity and conciseness',
        'Add specific metrics where possible',
        'Ensure alignment with grant objectives',
      ],
    };
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
