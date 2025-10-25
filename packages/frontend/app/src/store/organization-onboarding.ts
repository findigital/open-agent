import { create } from 'zustand';
import { gql } from '@/lib/gql';

export interface QualityScore {
  identity: number;
  needs: number;
  programs: number;
  capacity: number;
  impact: number;
  overall: number;
}

export interface Recommendation {
  priority: string;
  action: string;
  benefit: string;
  pointsGain: number;
  estimatedTime: string;
  category: string;
}

export interface OnboardingProgress {
  id: string;
  organizationId: string;
  currentStep: number;
  completedSteps: number[];
  qualityScore: number;
  isComplete: boolean;
}

export interface ExtractedData {
  mission?: string;
  vision?: string;
  values?: string[];
  focusAreas?: string[];
  primaryNeed?: string;
  needEvidence?: Array<{ statistic: string; source: string; year?: number }>;
  uniqueApproach?: string;
  gapsInSolutions?: string;
  impactWithoutOrg?: string;
  programs?: Array<any>;
  confidence: number;
}

export interface OrganizationOnboardingState {
  currentStep: number;
  progress: OnboardingProgress | null;
  qualityScore: QualityScore | null;
  recommendations: Recommendation[];
  extracting: boolean;
  extractedData: ExtractedData | null;

  // Actions
  startOnboarding: (organizationId: string) => Promise<void>;
  loadProgress: (organizationId: string) => Promise<void>;
  loadQualityScore: (organizationId: string) => Promise<void>;
  loadRecommendations: (organizationId: string) => Promise<void>;

  saveBasicInfo: (organizationId: string, data: any) => Promise<void>;
  saveMission: (organizationId: string, data: any) => Promise<void>;
  saveNeeds: (organizationId: string, data: any) => Promise<void>;
  addProgram: (organizationId: string, data: any) => Promise<void>;
  saveCapacity: (organizationId: string, data: any) => Promise<void>;
  completeOnboarding: (organizationId: string) => Promise<void>;

  extractFromDocument: (organizationId: string, documentContent: string) => Promise<ExtractedData>;
  extractFromWebsite: (organizationId: string, websiteUrl: string) => Promise<ExtractedData>;

  setCurrentStep: (step: number) => void;
  reset: () => void;
}

export const useOrganizationOnboardingStore = create<OrganizationOnboardingState>((set, get) => ({
  currentStep: 1,
  progress: null,
  qualityScore: null,
  recommendations: [],
  extracting: false,
  extractedData: null,

  startOnboarding: async (organizationId: string) => {
    const res = await gql({
      query: `
        mutation StartOnboarding($organizationId: ID!) {
          startOnboarding(organizationId: $organizationId) {
            id
            organizationId
            currentStep
            completedSteps
            qualityScore
            isComplete
          }
        }
      `,
      variables: { organizationId },
    });

    set({
      progress: res.data.startOnboarding,
      currentStep: res.data.startOnboarding.currentStep,
    });
  },

  loadProgress: async (organizationId: string) => {
    const res = await gql({
      query: `
        query GetOnboardingStatus($organizationId: ID!) {
          getOnboardingStatus(organizationId: $organizationId) {
            id
            organizationId
            currentStep
            completedSteps
            qualityScore
            isComplete
          }
        }
      `,
      variables: { organizationId },
    });

    if (res.data.getOnboardingStatus) {
      set({
        progress: res.data.getOnboardingStatus,
        currentStep: res.data.getOnboardingStatus.currentStep,
      });
    }
  },

  loadQualityScore: async (organizationId: string) => {
    const res = await gql({
      query: `
        query GetQualityScore($organizationId: ID!) {
          getQualityScore(organizationId: $organizationId) {
            identity
            needs
            programs
            capacity
            impact
            overall
          }
        }
      `,
      variables: { organizationId },
    });

    set({ qualityScore: res.data.getQualityScore });
  },

  loadRecommendations: async (organizationId: string) => {
    const res = await gql({
      query: `
        query GetOnboardingRecommendations($organizationId: ID!) {
          getOnboardingRecommendations(organizationId: $organizationId) {
            priority
            action
            benefit
            pointsGain
            estimatedTime
            category
          }
        }
      `,
      variables: { organizationId },
    });

    set({ recommendations: res.data.getOnboardingRecommendations });
  },

  saveBasicInfo: async (organizationId: string, data: any) => {
    await gql({
      query: `
        mutation SaveBasicInfo($input: BasicInfoInput!) {
          saveBasicInfo(input: $input)
        }
      `,
      variables: { input: { organizationId, ...data } },
    });

    // Reload quality score after save
    await get().loadQualityScore(organizationId);
  },

  saveMission: async (organizationId: string, data: any) => {
    await gql({
      query: `
        mutation SaveMission($input: MissionInput!) {
          saveMission(input: $input)
        }
      `,
      variables: { input: { organizationId, ...data } },
    });

    await get().loadQualityScore(organizationId);
  },

  saveNeeds: async (organizationId: string, data: any) => {
    await gql({
      query: `
        mutation SaveNeeds($input: SaveNeedsInput!) {
          saveNeeds(input: $input)
        }
      `,
      variables: { input: { organizationId, ...data } },
    });

    await get().loadQualityScore(organizationId);
  },

  addProgram: async (organizationId: string, data: any) => {
    await gql({
      query: `
        mutation AddProgram($input: ProgramInput!) {
          addProgram(input: $input)
        }
      `,
      variables: { input: { organizationId, ...data } },
    });

    await get().loadQualityScore(organizationId);
  },

  saveCapacity: async (organizationId: string, data: any) => {
    await gql({
      query: `
        mutation SaveCapacity($input: CapacityInput!) {
          saveCapacity(input: $input)
        }
      `,
      variables: { input: { organizationId, ...data } },
    });

    await get().loadQualityScore(organizationId);
  },

  completeOnboarding: async (organizationId: string) => {
    await gql({
      query: `
        mutation CompleteOnboarding($organizationId: ID!) {
          completeOnboarding(organizationId: $organizationId)
        }
      `,
      variables: { organizationId },
    });

    await get().loadProgress(organizationId);
  },

  extractFromDocument: async (organizationId: string, documentContent: string) => {
    set({ extracting: true });

    try {
      const res = await gql({
        query: `
          mutation ExtractFromDocument($organizationId: ID!, $documentContent: String!) {
            extractFromDocument(organizationId: $organizationId, documentContent: $documentContent) {
              mission
              vision
              values
              focusAreas
              primaryNeed
              needEvidence
              uniqueApproach
              gapsInSolutions
              impactWithoutOrg
              programs
              confidence
            }
          }
        `,
        variables: { organizationId, documentContent },
      });

      const extracted = res.data.extractFromDocument;
      set({ extractedData: extracted, extracting: false });

      // Reload quality score after extraction auto-saves
      await get().loadQualityScore(organizationId);

      return extracted;
    } catch (error) {
      set({ extracting: false });
      throw error;
    }
  },

  extractFromWebsite: async (organizationId: string, websiteUrl: string) => {
    set({ extracting: true });

    try {
      const res = await gql({
        query: `
          mutation ExtractFromWebsite($organizationId: ID!, $websiteUrl: String!) {
            extractFromWebsite(organizationId: $organizationId, websiteUrl: $websiteUrl) {
              mission
              vision
              values
              focusAreas
              primaryNeed
              needEvidence
              uniqueApproach
              gapsInSolutions
              impactWithoutOrg
              programs
              confidence
            }
          }
        `,
        variables: { organizationId, websiteUrl },
      });

      const extracted = res.data.extractFromWebsite;
      set({ extractedData: extracted, extracting: false });

      // Reload quality score after extraction auto-saves
      await get().loadQualityScore(organizationId);

      return extracted;
    } catch (error) {
      set({ extracting: false });
      throw error;
    }
  },

  setCurrentStep: (step: number) => {
    set({ currentStep: step });
  },

  reset: () => {
    set({
      currentStep: 1,
      progress: null,
      qualityScore: null,
      recommendations: [],
      extracting: false,
      extractedData: null,
    });
  },
}));
