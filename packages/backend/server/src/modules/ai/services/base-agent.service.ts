import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentTool,
} from '../types/agent.types';

@Injectable()
export class BaseAgentService {
  private readonly logger = new Logger(BaseAgentService.name);
  private readonly anthropic: Anthropic;
  private readonly defaultModel = 'claude-3-5-sonnet-20241022';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured - AI features will not work');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey || 'placeholder',
    });
  }

  /**
   * Execute an AI agent with the given configuration
   */
  async execute(
    config: AgentConfig,
    messages: AgentMessage[],
    context: AgentContext,
    tools?: AgentTool[]
  ): Promise<AgentResponse> {
    try {
      this.logger.log(`Executing ${config.role} agent: ${config.name}`);

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(config, context);

      // Convert tools to Anthropic format
      const anthropicTools = tools?.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: config.model || this.defaultModel,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content,
        })),
        tools: anthropicTools,
      });

      // Handle tool use if needed
      if (response.stop_reason === 'tool_use') {
        const toolResults = await this.handleToolUse(response, tools || [], context);

        // Continue conversation with tool results
        const followupResponse = await this.anthropic.messages.create({
          model: config.model || this.defaultModel,
          max_tokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0.7,
          system: systemPrompt,
          messages: [
            ...messages.map(msg => ({
              role: msg.role === 'system' ? 'user' : msg.role,
              content: msg.content,
            })),
            {
              role: 'assistant',
              content: response.content,
            },
            {
              role: 'user',
              content: toolResults,
            },
          ],
        });

        return this.formatResponse(followupResponse);
      }

      return this.formatResponse(response);
    } catch (error) {
      this.logger.error(`Agent execution failed for ${config.role}:`, error);
      throw error;
    }
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(config: AgentConfig, context: AgentContext): string {
    let prompt = config.systemPrompt;

    // Add context information
    prompt += '\n\n## Context\n';
    prompt += `- Organization ID: ${context.organizationId}\n`;
    prompt += `- Workspace ID: ${context.workspaceId}\n`;

    if (context.proposalId) {
      prompt += `- Proposal ID: ${context.proposalId}\n`;
    }

    if (context.grantId) {
      prompt += `- Grant ID: ${context.grantId}\n`;
    }

    prompt += '\n## Instructions\n';
    prompt += '- Provide detailed, professional responses\n';
    prompt += '- Use tools when available to gather accurate information\n';
    prompt += '- Be concise but thorough\n';
    prompt += '- Format responses in Markdown when appropriate\n';

    return prompt;
  }

  /**
   * Handle tool use in agent responses
   */
  private async handleToolUse(
    response: Anthropic.Message,
    tools: AgentTool[],
    context: AgentContext
  ): Promise<any> {
    const toolResults = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const tool = tools.find(t => t.name === block.name);

        if (tool) {
          try {
            const result = await tool.handler(block.input, context);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (error) {
            this.logger.error(`Tool execution failed: ${block.name}`, error);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: 'Tool execution failed' }),
            });
          }
        }
      }
    }

    return toolResults;
  }

  /**
   * Format Anthropic response to AgentResponse
   */
  private formatResponse(response: Anthropic.Message): AgentResponse {
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    return {
      content: textContent,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      metadata: {
        id: response.id,
        model: response.model,
        stopReason: response.stop_reason,
      },
    };
  }

  /**
   * Stream agent response (for real-time updates)
   */
  async *stream(
    config: AgentConfig,
    messages: AgentMessage[],
    context: AgentContext
  ): AsyncGenerator<string> {
    const systemPrompt = this.buildSystemPrompt(config, context);

    const stream = await this.anthropic.messages.create({
      model: config.model || this.defaultModel,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      })),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
