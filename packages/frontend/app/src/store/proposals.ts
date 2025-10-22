import { create } from 'zustand';

import { gql } from '@/lib/gql';

// This will be updated once GraphQL types are generated
export interface Proposal {
  id: string;
  title: string;
  status: string;
  requestedAmount?: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
  };
  template?: {
    id: string;
    name: string;
  };
  grant?: {
    id: string;
    title: string;
    funderName: string;
  };
  sections: Array<{
    id: string;
    title: string;
    completedAt?: string;
  }>;
}

export interface ProposalDetail extends Proposal {
  clientName?: string;
  sections: Array<{
    id: string;
    title: string;
    type: string;
    content: string;
    order: number;
    wordLimit?: number;
    completedAt?: string;
  }>;
  approvals?: Array<any>;
  comments?: Array<any>;
  versions?: Array<any>;
}

export interface Organization {
  id: string;
  name: string;
  mission?: string;
  description?: string;
  website?: string;
  workspaces: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export interface ProposalsState {
  organizations: Organization[];
  proposals: Proposal[];
  currentProposal: ProposalDetail | null;
  currentOrganization: Organization | null;
  currentWorkspaceId: string | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  refreshOrganizations: () => Promise<void>;
  refreshProposals: (workspaceId: string) => Promise<void>;
  loadProposal: (id: string) => Promise<void>;
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentWorkspace: (workspaceId: string | null) => void;
  generateSection: (input: {
    proposalId: string;
    sectionId: string;
    userGuidance?: string;
  }) => Promise<any>;
}

let abortPrevFetch: (() => void) | null = null;

export const useProposalsStore = create<ProposalsState>()((set, get) => ({
  organizations: [],
  proposals: [],
  currentProposal: null,
  currentOrganization: null,
  currentWorkspaceId: null,
  loading: false,
  initialized: false,

  refreshOrganizations: async () => {
    if (abortPrevFetch) {
      abortPrevFetch();
    }

    const controller = new AbortController();
    abortPrevFetch = () => controller.abort();

    set({ loading: true });
    try {
      const res = await gql({
        query: `
          query GetOrganizations {
            myOrganizations {
              id
              name
              mission
              description
              website
              workspaces {
                id
                name
                description
              }
              createdAt
            }
          }
        `,
        signal: controller.signal,
      });

      if (res.data) {
        set({
          organizations: res.data.myOrganizations || [],
          initialized: true,
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch organizations:', error);
      }
    } finally {
      set({ loading: false });
    }
  },

  refreshProposals: async (workspaceId: string) => {
    if (abortPrevFetch) {
      abortPrevFetch();
    }

    const controller = new AbortController();
    abortPrevFetch = () => controller.abort();

    set({ loading: true, currentWorkspaceId: workspaceId });
    try {
      const res = await gql({
        query: `
          query GetProposalsList($workspaceId: ID!) {
            proposals(workspaceId: $workspaceId) {
              id
              title
              status
              requestedAmount
              dueDate
              createdAt
              updatedAt
              workspace {
                id
                name
              }
              template {
                id
                name
              }
              grant {
                id
                title
                funderName
              }
              sections {
                id
                title
                completedAt
              }
            }
          }
        `,
        variables: { workspaceId },
        signal: controller.signal,
      });

      if (res.data) {
        set({ proposals: res.data.proposals || [] });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch proposals:', error);
      }
    } finally {
      set({ loading: false });
    }
  },

  loadProposal: async (id: string) => {
    set({ loading: true });
    try {
      const res = await gql({
        query: `
          query GetProposal($id: ID!) {
            proposal(id: $id) {
              id
              title
              clientName
              status
              requestedAmount
              dueDate
              createdAt
              updatedAt
              workspace {
                id
                name
                organization {
                  id
                  name
                }
              }
              template {
                id
                name
                category
              }
              grant {
                id
                title
                funderName
                description
                minAmount
                maxAmount
                closeDate
              }
              sections {
                id
                title
                type
                content
                order
                wordLimit
                completedAt
              }
            }
          }
        `,
        variables: { id },
      });

      if (res.data) {
        set({ currentProposal: res.data.proposal });
      }
    } catch (error) {
      console.error('Failed to load proposal:', error);
    } finally {
      set({ loading: false });
    }
  },

  setCurrentOrganization: (org: Organization | null) => {
    set({ currentOrganization: org });
  },

  setCurrentWorkspace: (workspaceId: string | null) => {
    set({ currentWorkspaceId: workspaceId });
  },

  generateSection: async (input) => {
    try {
      const res = await gql({
        query: `
          mutation GenerateProposalSection($input: ProposalGenerationInput!) {
            generateProposalSection(input: $input) {
              sectionId
              content
              wordCount
              confidence
              suggestions
              sources
            }
          }
        `,
        variables: { input },
      });

      if (res.data) {
        // Refresh the current proposal to get updated section
        if (input.proposalId === get().currentProposal?.id) {
          await get().loadProposal(input.proposalId);
        }
        return res.data.generateProposalSection;
      }
    } catch (error) {
      console.error('Failed to generate section:', error);
      throw error;
    }
  },
}));
