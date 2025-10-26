import { create } from 'zustand';
import { gql } from '../lib/gql';

/**
 * Impact Report Types
 */
export type ReportStatus = 'DRAFT' | 'IN_REVIEW' | 'SUBMITTED' | 'ACCEPTED' | 'NEEDS_REVISION';

export interface ImpactReport {
  id: string;
  awardId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  status: ReportStatus;
  peopleServed?: number;
  programsDelivered?: number;
  outcomesAchieved?: any;
  challenges?: string;
  successes?: string;
  storiesOfImpact?: string;
  lessonsLearned?: string;
  financialSummary?: any;
  aiGeneratedSummary?: string;
  aiGeneratedNarrative?: string;
  qualityScore?: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  award?: any;
  documents?: any[];
}

export interface ReportStats {
  totalReports: number;
  draftReports: number;
  submittedReports: number;
  averageQualityScore: number;
}

export interface EnhancementResult {
  originalText: string;
  enhancedText: string;
  suggestions: string[];
}

/**
 * Impact Report Store State
 */
interface ImpactReportState {
  reports: ImpactReport[];
  currentReport: ImpactReport | null;
  stats: ReportStats | null;
  loading: boolean;
  saving: boolean;
  enhancing: boolean;
  error: string | null;

  // Actions
  loadReport: (reportId: string) => Promise<void>;
  loadReportsByAward: (awardId: string) => Promise<void>;
  loadStats: (organizationId: string) => Promise<void>;
  createReport: (input: {
    awardId: string;
    reportingPeriodStart: string;
    reportingPeriodEnd: string;
  }) => Promise<ImpactReport>;
  updateReport: (reportId: string, input: Partial<ImpactReport>) => Promise<void>;
  enhanceNarrative: (input: {
    reportId: string;
    section: 'challenges' | 'successes' | 'storiesOfImpact' | 'lessonsLearned';
    currentText: string;
  }) => Promise<EnhancementResult>;
  generateSummary: (reportId: string) => Promise<string>;
  submitReport: (input: {
    reportId: string;
    recipientEmail?: string;
    message?: string;
  }) => Promise<void>;
  linkDocument: (reportId: string, documentId: string) => Promise<void>;
  unlinkDocument: (reportId: string, documentId: string) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  exportPdf: (reportId: string) => Promise<string>;
  clearError: () => void;
}

/**
 * Impact Report Store
 */
export const useImpactReportStore = create<ImpactReportState>()((set, get) => ({
  reports: [],
  currentReport: null,
  stats: null,
  loading: false,
  saving: false,
  enhancing: false,
  error: null,

  /**
   * Load a single impact report by ID
   */
  loadReport: async (reportId: string) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query ImpactReport($reportId: String!) {
          impactReport(reportId: $reportId) {
            id
            awardId
            reportingPeriodStart
            reportingPeriodEnd
            status
            peopleServed
            programsDelivered
            outcomesAchieved
            challenges
            successes
            storiesOfImpact
            lessonsLearned
            financialSummary
            aiGeneratedSummary
            aiGeneratedNarrative
            qualityScore
            createdAt
            updatedAt
            submittedAt
            award {
              id
              awardAmount
              proposal {
                id
                title
              }
            }
            documents {
              id
              document {
                id
                filename
                fileUrl
              }
            }
          }
        }
      `);

      const result = await query({ reportId });
      set({ currentReport: result.impactReport as any, loading: false });
    } catch (error) {
      set({ error: 'Failed to load impact report', loading: false });
      console.error('Failed to load impact report:', error);
    }
  },

  /**
   * Load all reports for an award
   */
  loadReportsByAward: async (awardId: string) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query ImpactReportsByAward($awardId: String!) {
          impactReportsByAward(awardId: $awardId) {
            id
            awardId
            reportingPeriodStart
            reportingPeriodEnd
            status
            peopleServed
            programsDelivered
            qualityScore
            createdAt
            updatedAt
            submittedAt
          }
        }
      `);

      const result = await query({ awardId });
      set({ reports: result.impactReportsByAward as any, loading: false });
    } catch (error) {
      set({ error: 'Failed to load impact reports', loading: false });
      console.error('Failed to load impact reports:', error);
    }
  },

  /**
   * Load organization statistics
   */
  loadStats: async (organizationId: string) => {
    set({ loading: true, error: null });
    try {
      const query = gql(`
        query ImpactReportStats($organizationId: String!) {
          impactReportStats(organizationId: $organizationId) {
            totalReports
            draftReports
            submittedReports
            averageQualityScore
          }
        }
      `);

      const result = await query({ organizationId });
      set({ stats: result.impactReportStats as any, loading: false });
    } catch (error) {
      set({ error: 'Failed to load statistics', loading: false });
      console.error('Failed to load statistics:', error);
    }
  },

  /**
   * Create a new impact report
   */
  createReport: async (input) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation CreateImpactReport($input: CreateImpactReportInput!) {
          createImpactReport(input: $input) {
            id
            awardId
            reportingPeriodStart
            reportingPeriodEnd
            status
            qualityScore
            createdAt
            updatedAt
          }
        }
      `);

      const result = await mutation({ input });
      const report = result.createImpactReport as any;

      set({
        currentReport: report,
        reports: [...get().reports, report],
        loading: false
      });

      return report;
    } catch (error) {
      set({ error: 'Failed to create impact report', loading: false });
      console.error('Failed to create impact report:', error);
      throw error;
    }
  },

  /**
   * Update impact report (save draft)
   */
  updateReport: async (reportId: string, input: Partial<ImpactReport>) => {
    set({ saving: true, error: null });
    try {
      const mutation = gql(`
        mutation UpdateImpactReport($reportId: String!, $input: UpdateImpactReportInput!) {
          updateImpactReport(reportId: $reportId, input: $input) {
            id
            awardId
            reportingPeriodStart
            reportingPeriodEnd
            status
            peopleServed
            programsDelivered
            outcomesAchieved
            challenges
            successes
            storiesOfImpact
            lessonsLearned
            financialSummary
            aiGeneratedSummary
            aiGeneratedNarrative
            qualityScore
            updatedAt
          }
        }
      `);

      const result = await mutation({ reportId, input });
      const updated = result.updateImpactReport as any;

      set({
        currentReport: updated,
        saving: false
      });

      // Update in reports list if exists
      const reports = get().reports;
      const index = reports.findIndex(r => r.id === reportId);
      if (index !== -1) {
        reports[index] = { ...reports[index], ...updated };
        set({ reports: [...reports] });
      }
    } catch (error) {
      set({ error: 'Failed to save report', saving: false });
      console.error('Failed to save report:', error);
      throw error;
    }
  },

  /**
   * Enhance narrative section with AI
   */
  enhanceNarrative: async (input) => {
    set({ enhancing: true, error: null });
    try {
      const mutation = gql(`
        mutation EnhanceNarrative($input: EnhanceNarrativeInput!) {
          enhanceNarrative(input: $input) {
            originalText
            enhancedText
            suggestions
          }
        }
      `);

      const result = await mutation({ input });
      set({ enhancing: false });

      return result.enhanceNarrative as any;
    } catch (error) {
      set({ error: 'Failed to enhance narrative', enhancing: false });
      console.error('Failed to enhance narrative:', error);
      throw error;
    }
  },

  /**
   * Generate AI summary
   */
  generateSummary: async (reportId: string) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation GenerateReportSummary($reportId: String!) {
          generateReportSummary(reportId: $reportId)
        }
      `);

      const result = await mutation({ reportId });
      const summary = result.generateReportSummary;

      // Update current report with generated summary
      const current = get().currentReport;
      if (current && current.id === reportId) {
        set({
          currentReport: { ...current, aiGeneratedSummary: summary },
          loading: false
        });
      } else {
        set({ loading: false });
      }

      return summary;
    } catch (error) {
      set({ error: 'Failed to generate summary', loading: false });
      console.error('Failed to generate summary:', error);
      throw error;
    }
  },

  /**
   * Submit report for review
   */
  submitReport: async (input) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation SubmitImpactReport($input: SubmitReportInput!) {
          submitImpactReport(input: $input) {
            id
            status
            submittedAt
          }
        }
      `);

      const result = await mutation({ input });
      const submitted = result.submitImpactReport as any;

      // Update current report
      const current = get().currentReport;
      if (current && current.id === input.reportId) {
        set({
          currentReport: { ...current, ...submitted },
          loading: false
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to submit report', loading: false });
      console.error('Failed to submit report:', error);
      throw error;
    }
  },

  /**
   * Link document to report
   */
  linkDocument: async (reportId: string, documentId: string) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation LinkDocumentToReport($reportId: String!, $documentId: String!) {
          linkDocumentToReport(reportId: $reportId, documentId: $documentId)
        }
      `);

      await mutation({ reportId, documentId });

      // Reload report to get updated documents
      await get().loadReport(reportId);
    } catch (error) {
      set({ error: 'Failed to link document', loading: false });
      console.error('Failed to link document:', error);
      throw error;
    }
  },

  /**
   * Unlink document from report
   */
  unlinkDocument: async (reportId: string, documentId: string) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation UnlinkDocumentFromReport($reportId: String!, $documentId: String!) {
          unlinkDocumentFromReport(reportId: $reportId, documentId: $documentId)
        }
      `);

      await mutation({ reportId, documentId });

      // Reload report to get updated documents
      await get().loadReport(reportId);
    } catch (error) {
      set({ error: 'Failed to unlink document', loading: false });
      console.error('Failed to unlink document:', error);
      throw error;
    }
  },

  /**
   * Delete report (draft only)
   */
  deleteReport: async (reportId: string) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation DeleteImpactReport($reportId: String!) {
          deleteImpactReport(reportId: $reportId)
        }
      `);

      await mutation({ reportId });

      // Remove from reports list
      const reports = get().reports.filter(r => r.id !== reportId);
      set({
        reports,
        currentReport: get().currentReport?.id === reportId ? null : get().currentReport,
        loading: false
      });
    } catch (error) {
      set({ error: 'Failed to delete report', loading: false });
      console.error('Failed to delete report:', error);
      throw error;
    }
  },

  /**
   * Export report as PDF
   */
  exportPdf: async (reportId: string) => {
    set({ loading: true, error: null });
    try {
      const mutation = gql(`
        mutation ExportImpactReportPdf($reportId: String!) {
          exportImpactReportPdf(reportId: $reportId)
        }
      `);

      const result = await mutation({ reportId });
      const pdfPath = result.exportImpactReportPdf;

      set({ loading: false });
      return pdfPath;
    } catch (error) {
      set({ error: 'Failed to export PDF', loading: false });
      console.error('Failed to export PDF:', error);
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),
}));
