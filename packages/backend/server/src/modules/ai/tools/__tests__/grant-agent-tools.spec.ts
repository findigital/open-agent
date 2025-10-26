import test from 'ava';
import Sinon from 'sinon';

import { Config } from '../../../../base';
import { PrismaService } from '../../../../base/prisma/prisma.service';
import { AgentContext } from '../../types/agent.types';
import { createGrantAgentTools } from '../grant-agent-tools';

test('createGrantAgentTools returns an array of tools', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_exa_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);

  t.true(Array.isArray(tools));
  t.true(tools.length >= 6); // At least 6 tools (3 Exa + 3 non-Exa + 2 simplified)
});

test('each tool has required structure', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_exa_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);

  tools.forEach(tool => {
    t.is(typeof tool.name, 'string', `Tool ${tool.name} should have string name`);
    t.is(
      typeof tool.description,
      'string',
      `Tool ${tool.name} should have string description`
    );
    t.is(
      typeof tool.inputSchema,
      'object',
      `Tool ${tool.name} should have object inputSchema`
    );
    t.is(
      typeof tool.handler,
      'function',
      `Tool ${tool.name} should have function handler`
    );
  });
});

test('includes grants_gov_search tool when Exa API key is present', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_exa_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const grantsGovTool = tools.find(t => t.name === 'grants_gov_search');

  t.truthy(grantsGovTool);
  t.true(grantsGovTool!.description.includes('Search federal grant'));
});

test('includes funder_research tool when Exa API key is present', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_exa_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const funderTool = tools.find(t => t.name === 'funder_research');

  t.truthy(funderTool);
  t.is(typeof funderTool?.description, 'string');
});

test('includes research_citations tool when Exa API key is present', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_exa_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const citationsTool = tools.find(t => t.name === 'research_citations');

  t.truthy(citationsTool);
});

test('excludes Exa tools when API key is missing', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {}, // No key
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);

  const grantsGovTool = tools.find(t => t.name === 'grants_gov_search');
  const funderTool = tools.find(t => t.name === 'funder_research');
  const citationsTool = tools.find(t => t.name === 'research_citations');

  t.falsy(grantsGovTool);
  t.falsy(funderTool);
  t.falsy(citationsTool);
});

test('always includes grant_eligibility_check tool', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {}, // No key
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const eligibilityTool = tools.find(t => t.name === 'grant_eligibility_check');

  t.truthy(eligibilityTool);
  t.is(typeof eligibilityTool?.handler, 'function');
});

test('always includes budget_validator tool', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {},
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const budgetValidatorTool = tools.find(t => t.name === 'budget_validator');

  t.truthy(budgetValidatorTool);
});

test('always includes impact_metrics_calculator tool', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {},
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const impactTool = tools.find(t => t.name === 'impact_metrics_calculator');

  t.truthy(impactTool);
});

test('includes simplified budget_calculator tool', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {},
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const budgetCalcTool = tools.find(t => t.name === 'budget_calculator');

  t.truthy(budgetCalcTool);
  t.true(budgetCalcTool!.description.includes('Returns budget breakdown as structured data'));
});

test('includes simplified timeline_generator tool', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {},
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const timelineTool = tools.find(t => t.name === 'timeline_generator');

  t.truthy(timelineTool);
  t.true(timelineTool!.description.includes('Returns text-based timeline'));
});

test('budget_calculator handler calculates correctly', async t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {},
    },
  } as Config;

  const mockPrisma = {} as PrismaService;
  const mockContext: AgentContext = {
    organizationId: 'org-123',
    workspaceId: 'ws-123',
    userId: 'user-123',
  };

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const budgetCalcTool = tools.find(t => t.name === 'budget_calculator');

  const input = {
    personnel: [
      {
        role: 'Project Director',
        salary: 100000,
        ftePercent: 50,
        fringeRate: 30,
      },
      {
        role: 'Program Manager',
        salary: 80000,
        ftePercent: 100,
        fringeRate: 30,
      },
    ],
    otherDirectCosts: [
      {
        category: 'Travel',
        item: 'Conference attendance',
        amount: 5000,
      },
    ],
    indirectRate: 15,
  };

  const result = await budgetCalcTool!.handler(input, mockContext);

  // Verify calculations
  t.is(result.summary.totalPersonnel, 130000); // 50k + 80k
  t.is(result.summary.totalFringe, 39000); // 30% of 130k
  t.is(result.summary.totalOtherDirect, 5000);
  t.is(result.summary.totalDirectCosts, 174000); // 130k + 39k + 5k
  t.is(result.summary.indirectCosts, 26100); // 15% of 174k
  t.is(result.summary.totalProjectCost, 200100); // 174k + 26.1k
  t.true(Array.isArray(result.breakdown.personnel));
  t.is(result.breakdown.personnel.length, 2);
});

test('timeline_generator handler generates timeline', async t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {},
    },
  } as Config;

  const mockPrisma = {} as PrismaService;
  const mockContext: AgentContext = {
    organizationId: 'org-123',
    workspaceId: 'ws-123',
    userId: 'user-123',
  };

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const timelineTool = tools.find(t => t.name === 'timeline_generator');

  const input = {
    projectTitle: 'STEM Education Initiative',
    startDate: '2025-01-01',
    endDate: '2026-01-01',
    phases: [
      {
        name: 'Planning',
        description: 'Develop curriculum',
        durationMonths: 3,
      },
      {
        name: 'Implementation',
        description: 'Pilot program',
        durationMonths: 6,
        dependencies: ['Planning'],
      },
      {
        name: 'Evaluation',
        description: 'Assess outcomes',
        durationMonths: 3,
        dependencies: ['Implementation'],
      },
    ],
  };

  const result = await timelineTool!.handler(input, mockContext);

  t.is(typeof result.timeline, 'string');
  t.true(result.timeline.includes('STEM Education Initiative'));
  t.true(result.timeline.includes('Planning'));
  t.true(result.timeline.includes('Implementation'));
  t.true(result.timeline.includes('Evaluation'));
  t.is(result.phaseCount, 3);
  t.is(result.totalMonths, 12);
});

test('tool inputSchema is valid JSON Schema', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);

  tools.forEach(tool => {
    t.is(typeof tool.inputSchema, 'object', `Tool ${tool.name} has object schema`);
    t.is(
      tool.inputSchema.type,
      'object',
      `Tool ${tool.name} schema has type: object`
    );
    t.truthy(
      tool.inputSchema.properties,
      `Tool ${tool.name} schema has properties`
    );
  });
});

test('does NOT include competitive_analysis tool', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const competitiveTool = tools.find(t => t.name === 'competitive_analysis');

  t.falsy(competitiveTool);
});

test('does NOT include proposal_analyzer tool', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);
  const analyzerTool = tools.find(t => t.name === 'proposal_analyzer');

  t.falsy(analyzerTool);
});

test('returns expected number of tools with all features enabled', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: { key: 'test_key' },
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);

  // Should have 8 tools: 3 Exa + 5 non-Exa
  t.is(tools.length, 8);
});

test('returns expected number of tools with no API keys', t => {
  const mockConfig = {
    copilot: {
      enabled: true,
      exa: {},
    },
  } as Config;

  const mockPrisma = {} as PrismaService;

  const tools = createGrantAgentTools(mockConfig, mockPrisma);

  // Should have 5 tools: grant_eligibility_check, budget_validator,
  // impact_metrics_calculator, budget_calculator, timeline_generator
  t.is(tools.length, 5);
});
