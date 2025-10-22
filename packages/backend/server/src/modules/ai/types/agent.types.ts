/**
 * AI Agent Types and Interfaces
 */

export enum AgentRole {
  RESEARCH = 'research',
  CONTEXT = 'context',
  PLANNING = 'planning',
  WRITING = 'writing',
  COMPLIANCE = 'compliance',
  EDITING = 'editing',
}

export interface AgentConfig {
  role: AgentRole;
  name: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AgentContext {
  organizationId: string;
  workspaceId: string;
  proposalId?: string;
  grantId?: string;
  templateId?: string;
  userId: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (input: any, context: AgentContext) => Promise<any>;
}

export interface ProposalGenerationInput {
  proposalId: string;
  sectionId?: string;
  grantId?: string;
  templateId?: string;
  userGuidance?: string;
  regenerate?: boolean;
}

export interface ProposalGenerationResult {
  sectionId: string;
  content: string;
  wordCount: number;
  confidence: number;
  suggestions?: string[];
  sources?: string[];
}

export interface ComplianceCheckResult {
  compliant: boolean;
  score: number;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    section?: string;
    issue: string;
    suggestion: string;
  }>;
  recommendations: string[];
}
