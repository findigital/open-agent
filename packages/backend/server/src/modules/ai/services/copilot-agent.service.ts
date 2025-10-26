import { Injectable, Logger } from '@nestjs/common';
import { generateText, streamText } from 'ai';
import { CopilotProviderFactory } from '../../../plugins/copilot/providers';
import { Config } from '../../../base';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentTool,
} from '../types/agent.types';

/**
 * Enhanced BaseAgentService that uses the copilot provider system
 *
 * Benefits over direct Anthropic SDK:
 * - Multi-provider support (Claude, GPT, Gemini, Perplexity)
 * - Built-in multi-turn tool calling (via maxSteps)
 * - Automatic prompt caching
 * - Better error handling
 * - Consistent with rest of open-agent architecture
 */
@Injectable()
export class CopilotAgentService {
  private readonly logger = new Logger(CopilotAgentService.name);
  private readonly MAX_STEPS = 5; // Allow up to 5 tool calling turns

  constructor(
    private readonly copilotFactory: CopilotProviderFactory,
    private readonly config: Config,
  ) {}

  /**
   * Execute an AI agent using copilot provider
   */
  async execute(
    config: AgentConfig,
    messages: AgentMessage[],
    context: AgentContext,
    tools?: AgentTool[],
  ): Promise<AgentResponse> {
    try {
      this.logger.log(`Executing ${config.role} agent: ${config.name}`);

      // Get copilot provider (multi-provider support!)
      const provider = await this.getProvider();
      if (!provider) {
        throw new Error('No copilot provider available. Please configure ANTHROPIC_API_KEY or another provider.');
      }

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(config, context);

      // Convert AgentTool format to Vercel AI SDK tool format
      const aiTools = this.convertToolsToAIFormat(tools || [], context);

      // Build messages in Vercel AI SDK format
      const aiMessages = this.convertMessagesToAIFormat(messages);

      // Determine model to use
      const modelId = config.model || this.getDefaultModel();

      // Get model instance from provider
      const model = provider.instance(modelId);

      // Call generateText with multi-turn tool support
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: aiMessages,
        tools: aiTools,
        maxSteps: this.MAX_STEPS, // Enable multi-turn tool calling
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens || 4096,
      });

      this.logger.log(
        `Agent completed in ${result.usage?.totalTokens || 0} tokens (${result.usage?.completionTokens || 0} output)`
      );

      return {
        content: result.text,
        usage: {
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
        },
        metadata: {
          model: modelId,
          steps: result.steps?.length || 1,
          stopReason: result.finishReason || 'stop',
        },
      };
    } catch (error) {
      this.logger.error(`Agent execution failed for ${config.role}:`, error);
      throw error;
    }
  }

  /**
   * Execute with multi-turn reasoning (explicit control over turns)
   */
  async executeWithReasoning(
    config: AgentConfig,
    initialMessage: AgentMessage,
    context: AgentContext,
    tools: AgentTool[],
    maxTurns: number = 5,
  ): Promise<AgentResponse> {
    // Use the same execute method with maxSteps
    return this.execute(
      config,
      [initialMessage],
      context,
      tools,
    );
  }

  /**
   * Stream agent response for real-time updates
   */
  async *stream(
    config: AgentConfig,
    messages: AgentMessage[],
    context: AgentContext,
    tools?: AgentTool[],
  ): AsyncGenerator<string> {
    const provider = await this.getProvider();
    if (!provider) {
      throw new Error('No copilot provider available');
    }

    const systemPrompt = this.buildSystemPrompt(config, context);
    const aiTools = this.convertToolsToAIFormat(tools || [], context);
    const aiMessages = this.convertMessagesToAIFormat(messages);
    const modelId = config.model || this.getDefaultModel();
    const model = provider.instance(modelId);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      tools: aiTools,
      maxSteps: this.MAX_STEPS,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 4096,
    });

    // Stream text chunks
    for await (const chunk of result.textStream) {
      yield chunk;
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
    prompt += '- You can call multiple tools across multiple turns to complete your task\n';
    prompt += '- Be concise but thorough\n';
    prompt += '- Format responses in Markdown when appropriate\n';

    return prompt;
  }

  /**
   * Convert AgentTool format to Vercel AI SDK tool format
   */
  private convertToolsToAIFormat(
    tools: AgentTool[],
    context: AgentContext,
  ): Record<string, any> {
    const aiTools: Record<string, any> = {};

    for (const tool of tools) {
      aiTools[tool.name] = {
        description: tool.description,
        parameters: tool.inputSchema,
        execute: async (args: any) => {
          try {
            this.logger.debug(`Executing tool: ${tool.name}`);
            const result = await tool.handler(args, context);
            this.logger.debug(`Tool ${tool.name} completed successfully`);
            return result;
          } catch (error) {
            this.logger.error(`Tool ${tool.name} failed:`, error);
            return { error: `Tool execution failed: ${error.message}` };
          }
        },
      };
    }

    return aiTools;
  }

  /**
   * Convert AgentMessage format to Vercel AI SDK message format
   */
  private convertMessagesToAIFormat(messages: AgentMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role, // System messages -> user
      content: msg.content,
    }));
  }

  /**
   * Get copilot provider (tries Anthropic first, then others)
   */
  private async getProvider(): Promise<any> {
    // Try to get Anthropic provider (preferred for grant agents)
    const anthropicProvider = await this.copilotFactory.getProviderByType('anthropic');
    if (anthropicProvider) {
      return anthropicProvider;
    }

    // Fallback to any available provider
    const providers = ['openai', 'gemini', 'perplexity'];
    for (const type of providers) {
      const provider = await this.copilotFactory.getProviderByType(type as any);
      if (provider) {
        this.logger.warn(`Using ${type} provider as fallback (Anthropic not configured)`);
        return provider;
      }
    }

    return null;
  }

  /**
   * Get default model based on available provider
   */
  private getDefaultModel(): string {
    // Try to use Claude Sonnet 4 (best for grant writing)
    if (this.config.copilot.providers.anthropic?.apiKey) {
      return 'claude-sonnet-4@20250514';
    }

    // Fallback to GPT-4
    if (this.config.copilot.providers.openai?.apiKey) {
      return 'gpt-4o';
    }

    // Fallback to Gemini
    if (this.config.copilot.providers.gemini?.apiKey) {
      return 'gemini-2.5-flash';
    }

    // Default to Claude (will error if not configured)
    return 'claude-sonnet-4@20250514';
  }
}
