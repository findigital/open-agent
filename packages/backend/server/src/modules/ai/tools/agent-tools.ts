import { AgentTool, AgentContext } from '../types/agent.types';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { DocumentService } from '../../document/document.service';
import { GrantService } from '../../grant/grant.service';

/**
 * AI Agent Tools
 * These tools allow agents to interact with the system
 */

export function createAgentTools(
  prisma: PrismaService,
  documentService: DocumentService,
  grantService: GrantService
): AgentTool[] {
  return [
    // Search for grants
    {
      name: 'search_grants',
      description: 'Search for grant opportunities based on keywords, categories, or funding amounts',
      inputSchema: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keywords to search for in grant titles and descriptions',
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Grant categories (e.g., education, health, environment)',
          },
          minAmount: {
            type: 'number',
            description: 'Minimum funding amount',
          },
          maxAmount: {
            type: 'number',
            description: 'Maximum funding amount',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10,
          },
        },
      },
      handler: async (input: any) => {
        const grants = await grantService.search({
          keywords: input.keywords,
          category: input.categories,
          minAmount: input.minAmount,
          maxAmount: input.maxAmount,
          openOnly: true,
          limit: input.limit || 10,
          offset: 0,
        });

        return grants.map(grant => ({
          id: grant.id,
          title: grant.title,
          funder: grant.funderName,
          description: grant.description,
          eligibility: grant.eligibility,
          amount: {
            min: grant.minAmount,
            max: grant.maxAmount,
          },
          deadline: grant.closeDate,
          url: grant.url,
        }));
      },
    },

    // Get grant details
    {
      name: 'get_grant_details',
      description: 'Get detailed information about a specific grant opportunity',
      inputSchema: {
        type: 'object',
        properties: {
          grantId: {
            type: 'string',
            description: 'The ID of the grant to retrieve',
          },
        },
        required: ['grantId'],
      },
      handler: async (input: any) => {
        const grant = await grantService.findOne(input.grantId);

        if (!grant) {
          return { error: 'Grant not found' };
        }

        return {
          id: grant.id,
          title: grant.title,
          funder: grant.funderName,
          description: grant.description,
          eligibility: grant.eligibility,
          category: grant.category,
          keywords: grant.keywords,
          amount: {
            min: grant.minAmount,
            max: grant.maxAmount,
          },
          dates: {
            open: grant.openDate,
            close: grant.closeDate,
          },
          url: grant.url,
        };
      },
    },

    // Get organization context
    {
      name: 'get_organization_context',
      description: 'Retrieve relevant documents and context about the organization for proposal writing',
      inputSchema: {
        type: 'object',
        properties: {
          purpose: {
            type: 'string',
            enum: ['mission', 'impact', 'budget', 'capacity', 'general'],
            description: 'The purpose or section type to get context for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of documents to retrieve',
            default: 10,
          },
        },
        required: ['purpose'],
      },
      handler: async (input: any, context: AgentContext) => {
        const contextData = await documentService.getContextForProposal(
          context.organizationId,
          context.userId,
          input.purpose,
          input.limit || 10
        );

        return {
          purpose: input.purpose,
          context: contextData,
          wordCount: contextData.split(/\s+/).length,
        };
      },
    },

    // Get organization documents
    {
      name: 'list_organization_documents',
      description: 'List all documents available for the organization',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter by document type (mission, annual_report, program_description, etc.)',
          },
        },
      },
      handler: async (input: any, context: AgentContext) => {
        const documents = await documentService.findByOrganization(
          context.organizationId,
          context.userId,
          input.type
        );

        return documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          createdAt: doc.createdAt,
          wordCount: doc.content.split(/\s+/).length,
        }));
      },
    },

    // Get proposal template
    {
      name: 'get_proposal_template',
      description: 'Retrieve a proposal template with its sections and requirements',
      inputSchema: {
        type: 'object',
        properties: {
          templateId: {
            type: 'string',
            description: 'The ID of the template to retrieve',
          },
        },
        required: ['templateId'],
      },
      handler: async (input: any, context: AgentContext) => {
        const template = await prisma.proposalTemplate.findUnique({
          where: { id: input.templateId },
          include: {
            sections: {
              orderBy: { order: 'asc' },
            },
          },
        });

        if (!template) {
          return { error: 'Template not found' };
        }

        return {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          sections: template.sections.map(section => ({
            id: section.id,
            title: section.title,
            description: section.description,
            type: section.type,
            wordLimit: section.wordLimit,
            required: section.required,
            promptGuidance: section.promptGuidance,
          })),
        };
      },
    },

    // Get proposal current state
    {
      name: 'get_proposal',
      description: 'Get the current state of a proposal including all sections and their content',
      inputSchema: {
        type: 'object',
        properties: {
          proposalId: {
            type: 'string',
            description: 'The ID of the proposal to retrieve',
          },
        },
        required: ['proposalId'],
      },
      handler: async (input: any) => {
        const proposal = await prisma.proposal.findUnique({
          where: { id: input.proposalId },
          include: {
            sections: {
              orderBy: { order: 'asc' },
            },
            workspace: {
              include: {
                organization: true,
              },
            },
          },
        });

        if (!proposal) {
          return { error: 'Proposal not found' };
        }

        return {
          id: proposal.id,
          title: proposal.title,
          clientName: proposal.clientName,
          status: proposal.status,
          dueDate: proposal.dueDate,
          requestedAmount: proposal.requestedAmount,
          organization: {
            name: proposal.workspace.organization.name,
            mission: proposal.workspace.organization.mission,
          },
          sections: proposal.sections.map(section => ({
            id: section.id,
            title: section.title,
            type: section.type,
            content: section.content,
            wordCount: section.content.split(/\s+/).filter(w => w.length > 0).length,
            wordLimit: section.wordLimit,
            completed: section.completedAt !== null,
          })),
        };
      },
    },

    // Research compliance requirements
    {
      name: 'check_compliance_requirements',
      description: 'Check grant compliance requirements and proposal alignment',
      inputSchema: {
        type: 'object',
        properties: {
          grantId: {
            type: 'string',
            description: 'The grant opportunity ID to check compliance against',
          },
          proposalId: {
            type: 'string',
            description: 'The proposal ID to check',
          },
        },
        required: ['grantId'],
      },
      handler: async (input: any) => {
        const grant = await grantService.findOne(input.grantId);

        if (!grant) {
          return { error: 'Grant not found' };
        }

        // Extract compliance requirements from grant
        const requirements = {
          eligibility: grant.eligibility,
          fundingRange: {
            min: grant.minAmount,
            max: grant.maxAmount,
          },
          deadline: grant.closeDate,
          category: grant.category,
        };

        return {
          requirements,
          checkpoints: [
            'Organization eligibility verification',
            'Funding amount within range',
            'Timeline alignment with grant deadline',
            'Program alignment with grant focus areas',
            'Required documentation completeness',
          ],
        };
      },
    },
  ];
}
