import { create } from 'zustand';
import { gql } from '@/lib/gql';

export interface ComplianceRequirement {
  id: string;
  type: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  completedDate?: string;
  remindersSent: number;
  documents?: Array<{
    id: string;
    title: string;
  }>;
}

export interface ImpactReport {
  id: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  status: string;
  peopleServed?: number;
  programsDelivered?: number;
  aiGeneratedSummary?: string;
  qualityScore?: number;
  submittedAt?: string;
}

export interface GrantCommunication {
  id: string;
  type: string;
  subject: string;
  body: string;
  aiDrafted: boolean;
  sentAt?: string;
  recipientEmail?: string;
}

export interface GrantAward {
  id: string;
  awardAmount: number;
  awardDate: string;
  projectStartDate: string;
  projectEndDate: string;
  status: string;
  proposal: {
    id: string;
    title: string;
    workspace: {
      id: string;
      name: string;
      organization: {
        id: string;
        name: string;
      };
    };
  };
  requirements: ComplianceRequirement[];
  reports: ImpactReport[];
  communications: GrantCommunication[];
}

export interface AwardState {
  awards: GrantAward[];
  currentAward: GrantAward | null;
  upcomingDeadlines: ComplianceRequirement[];
  overdueRequirements: ComplianceRequirement[];
  loading: boolean;
  error: string | null;

  // Actions
  loadAward: (proposalId: string) => Promise<void>;
  loadAwardById: (awardId: string) => Promise<void>;
  loadActiveAwards: (organizationId: string) => Promise<void>;
  loadUpcomingDeadlines: (organizationId: string, days?: number) => Promise<void>;
  loadOverdueRequirements: (organizationId: string) => Promise<void>;
  createAward: (input: {
    proposalId: string;
    awardAmount: number;
    awardDate: string;
    projectStartDate: string;
    projectEndDate: string;
  }) => Promise<GrantAward>;
  addRequirement: (input: {
    awardId: string;
    type: string;
    title: string;
    description: string;
    dueDate: string;
  }) => Promise<ComplianceRequirement>;
  updateRequirement: (
    requirementId: string,
    input: {
      status?: string;
      completedDate?: string;
    }
  ) => Promise<ComplianceRequirement>;
  linkDocument: (requirementId: string, documentId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAwardStore = create<AwardState>()((set, get) => ({
  awards: [],
  currentAward: null,
  upcomingDeadlines: [],
  overdueRequirements: [],
  loading: false,
  error: null,

  loadAward: async (proposalId: string) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query AwardByProposal($proposalId: String!) {
          awardByProposal(proposalId: $proposalId) {
            id
            awardAmount
            awardDate
            projectStartDate
            projectEndDate
            status
            proposal {
              id
              title
              workspace {
                id
                name
                organization {
                  id
                  name
                }
              }
            }
            requirements {
              id
              type
              title
              description
              dueDate
              status
              completedDate
              remindersSent
            }
            reports {
              id
              reportingPeriodStart
              reportingPeriodEnd
              status
              peopleServed
              programsDelivered
              aiGeneratedSummary
              qualityScore
              submittedAt
            }
            communications {
              id
              type
              subject
              body
              aiDrafted
              sentAt
              recipientEmail
            }
          }
        }
      `);

      const result = await query({ proposalId });
      set({ currentAward: result.awardByProposal as any, loading: false });
    } catch (error) {
      console.error('Failed to load award:', error);
      set({ error: 'Failed to load award', loading: false });
    }
  },

  loadAwardById: async (awardId: string) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query Award($id: String!) {
          award(id: $id) {
            id
            awardAmount
            awardDate
            projectStartDate
            projectEndDate
            status
            proposal {
              id
              title
              workspace {
                id
                name
                organization {
                  id
                  name
                }
              }
            }
            requirements {
              id
              type
              title
              description
              dueDate
              status
              completedDate
              remindersSent
            }
            reports {
              id
              reportingPeriodStart
              reportingPeriodEnd
              status
              peopleServed
              programsDelivered
              aiGeneratedSummary
              qualityScore
              submittedAt
            }
            communications {
              id
              type
              subject
              body
              aiDrafted
              sentAt
              recipientEmail
            }
          }
        }
      `);

      const result = await query({ id: awardId });
      set({ currentAward: result.award as any, loading: false });
    } catch (error) {
      console.error('Failed to load award by ID:', error);
      set({ error: 'Failed to load award', loading: false });
    }
  },

  loadActiveAwards: async (organizationId: string) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query ActiveAwards($organizationId: String!) {
          activeAwards(organizationId: $organizationId) {
            id
            awardAmount
            awardDate
            projectStartDate
            projectEndDate
            status
            proposal {
              id
              title
              workspace {
                id
                name
              }
            }
            requirements {
              id
              type
              title
              dueDate
              status
            }
          }
        }
      `);

      const result = await query({ organizationId });
      set({ awards: result.activeAwards as any, loading: false });
    } catch (error) {
      console.error('Failed to load active awards:', error);
      set({ error: 'Failed to load active awards', loading: false });
    }
  },

  loadUpcomingDeadlines: async (organizationId: string, days: number = 30) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query UpcomingDeadlines($organizationId: String!, $days: Int!) {
          upcomingDeadlines(organizationId: $organizationId, days: $days) {
            id
            type
            title
            description
            dueDate
            status
            award {
              id
              proposal {
                id
                title
              }
            }
          }
        }
      `);

      const result = await query({ organizationId, days });
      set({ upcomingDeadlines: result.upcomingDeadlines as any, loading: false });
    } catch (error) {
      console.error('Failed to load upcoming deadlines:', error);
      set({ error: 'Failed to load upcoming deadlines', loading: false });
    }
  },

  loadOverdueRequirements: async (organizationId: string) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query OverdueRequirements($organizationId: String!) {
          overdueRequirements(organizationId: $organizationId) {
            id
            type
            title
            description
            dueDate
            status
            award {
              id
              proposal {
                id
                title
              }
            }
          }
        }
      `);

      const result = await query({ organizationId });
      set({ overdueRequirements: result.overdueRequirements as any, loading: false });
    } catch (error) {
      console.error('Failed to load overdue requirements:', error);
      set({ error: 'Failed to load overdue requirements', loading: false });
    }
  },

  createAward: async (input) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation CreateAward($input: CreateAwardInput!) {
          createAward(input: $input) {
            id
            awardAmount
            awardDate
            projectStartDate
            projectEndDate
            status
            proposal {
              id
              title
            }
          }
        }
      `);

      const result = await mutation({ input });
      set({ loading: false });
      return result.createAward as any;
    } catch (error) {
      console.error('Failed to create award:', error);
      set({ error: 'Failed to create award', loading: false });
      throw error;
    }
  },

  addRequirement: async (input) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation AddComplianceRequirement($input: AddRequirementInput!) {
          addComplianceRequirement(input: $input) {
            id
            type
            title
            description
            dueDate
            status
          }
        }
      `);

      const result = await mutation({ input });

      // Update current award if loaded
      const { currentAward } = get();
      if (currentAward && currentAward.id === input.awardId) {
        set({
          currentAward: {
            ...currentAward,
            requirements: [...currentAward.requirements, result.addComplianceRequirement as any],
          },
          loading: false,
        });
      } else {
        set({ loading: false });
      }

      return result.addComplianceRequirement as any;
    } catch (error) {
      console.error('Failed to add requirement:', error);
      set({ error: 'Failed to add requirement', loading: false });
      throw error;
    }
  },

  updateRequirement: async (requirementId, input) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation UpdateComplianceRequirement($id: String!, $input: UpdateRequirementInput!) {
          updateComplianceRequirement(id: $id, input: $input) {
            id
            type
            title
            description
            dueDate
            status
            completedDate
          }
        }
      `);

      const result = await mutation({ id: requirementId, input });

      // Update current award if loaded
      const { currentAward } = get();
      if (currentAward) {
        const updatedRequirements = currentAward.requirements.map((req) =>
          req.id === requirementId ? (result.updateComplianceRequirement as any) : req
        );
        set({
          currentAward: {
            ...currentAward,
            requirements: updatedRequirements,
          },
          loading: false,
        });
      } else {
        set({ loading: false });
      }

      return result.updateComplianceRequirement as any;
    } catch (error) {
      console.error('Failed to update requirement:', error);
      set({ error: 'Failed to update requirement', loading: false });
      throw error;
    }
  },

  linkDocument: async (requirementId, documentId) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation LinkDocumentToRequirement($requirementId: String!, $documentId: String!) {
          linkDocumentToRequirement(requirementId: $requirementId, documentId: $documentId)
        }
      `);

      const result = await mutation({ requirementId, documentId });
      set({ loading: false });
      return result.linkDocumentToRequirement;
    } catch (error) {
      console.error('Failed to link document:', error);
      set({ error: 'Failed to link document', loading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
