import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

/**
 * NotificationScheduler
 *
 * Handles automated cron jobs for grant lifecycle notifications:
 * - Daily compliance deadline checks
 * - Overdue requirement tracking
 * - Weekly compliance digests
 * - Monthly impact summaries
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Check for upcoming compliance deadlines
   * Runs daily at 9:00 AM
   *
   * Checks for requirements due in:
   * - 14 days (2 weeks notice)
   * - 7 days (1 week notice)
   * - 3 days (urgent notice)
   * - 1 day (final notice)
   */
  @Cron('0 9 * * *', {
    name: 'check-upcoming-deadlines',
    timeZone: 'America/New_York', // Adjust based on organization preference
  })
  async checkUpcomingDeadlines() {
    this.logger.log('Running daily upcoming deadlines check...');

    try {
      const now = new Date();
      const thresholds = [14, 7, 3, 1]; // Days until due

      for (const daysUntil of thresholds) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + daysUntil);

        // Set to start of day for consistent matching
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Find requirements due on this exact day
        const requirements = await this.prisma.complianceRequirement.findMany({
          where: {
            dueDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: {
              in: ['PENDING', 'IN_PROGRESS'],
            },
            // Only send if we haven't sent too many reminders
            remindersSent: {
              lt: 5, // Max 5 reminders per requirement
            },
          },
          include: {
            award: {
              include: {
                proposal: true,
              },
            },
          },
        });

        this.logger.log(
          `Found ${requirements.length} requirements due in ${daysUntil} days`,
        );

        // Send notifications for each requirement
        for (const requirement of requirements) {
          try {
            await this.notificationService.notifyComplianceDeadlineApproaching(
              requirement.id,
              daysUntil,
            );

            // Update reminder count and notification sent flag
            await this.prisma.complianceRequirement.update({
              where: { id: requirement.id },
              data: {
                notificationSent: true,
                remindersSent: {
                  increment: 1,
                },
              },
            });

            this.logger.log(
              `Sent ${daysUntil}-day reminder for requirement: ${requirement.title}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send notification for requirement ${requirement.id}:`,
              error,
            );
          }
        }
      }

      this.logger.log('Upcoming deadlines check completed');
    } catch (error) {
      this.logger.error('Error in upcoming deadlines check:', error);
    }
  }

  /**
   * Check for overdue compliance requirements
   * Runs daily at 10:00 AM
   *
   * Updates status to OVERDUE and sends escalation emails
   */
  @Cron('0 10 * * *', {
    name: 'check-overdue-requirements',
    timeZone: 'America/New_York',
  })
  async checkOverdueRequirements() {
    this.logger.log('Running daily overdue requirements check...');

    try {
      const now = new Date();

      // Find all requirements that are past due and not yet marked as overdue
      const overdueRequirements = await this.prisma.complianceRequirement.findMany({
        where: {
          dueDate: {
            lt: now,
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
        },
        include: {
          award: {
            include: {
              proposal: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${overdueRequirements.length} overdue requirements`,
      );

      for (const requirement of overdueRequirements) {
        try {
          // Calculate days past due
          const dueDate = new Date(requirement.dueDate);
          const daysPastDue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Update status to OVERDUE
          await this.prisma.complianceRequirement.update({
            where: { id: requirement.id },
            data: {
              status: 'OVERDUE',
            },
          });

          // Send overdue notification (limit to prevent spam)
          if (requirement.remindersSent < 10) {
            await this.notificationService.notifyComplianceOverdue(
              requirement.id,
              daysPastDue,
            );

            // Increment reminder count
            await this.prisma.complianceRequirement.update({
              where: { id: requirement.id },
              data: {
                remindersSent: {
                  increment: 1,
                },
              },
            });

            this.logger.log(
              `Sent overdue notification for requirement: ${requirement.title} (${daysPastDue} days past due)`,
            );
          } else {
            this.logger.warn(
              `Skipping notification for requirement ${requirement.id} - too many reminders sent`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to process overdue requirement ${requirement.id}:`,
            error,
          );
        }
      }

      this.logger.log('Overdue requirements check completed');
    } catch (error) {
      this.logger.error('Error in overdue requirements check:', error);
    }
  }

  /**
   * Send weekly compliance digests
   * Runs every Monday at 8:00 AM
   *
   * Sends comprehensive weekly summary to all organization admins
   */
  @Cron('0 8 * * 1', {
    name: 'send-weekly-compliance-digest',
    timeZone: 'America/New_York',
  })
  async sendWeeklyComplianceDigests() {
    this.logger.log('Sending weekly compliance digests...');

    try {
      // Get all organizations with active awards
      const organizations = await this.prisma.organization.findMany({
        where: {
          workspaces: {
            some: {
              proposals: {
                some: {
                  award: {
                    status: 'ACTIVE',
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      this.logger.log(
        `Sending weekly digests to ${organizations.length} organizations`,
      );

      for (const org of organizations) {
        try {
          await this.notificationService.sendWeeklyComplianceDigest(org.id);
          this.logger.log(`Sent weekly digest to organization: ${org.name}`);
        } catch (error) {
          this.logger.error(
            `Failed to send weekly digest to organization ${org.id}:`,
            error,
          );
        }
      }

      this.logger.log('Weekly compliance digests completed');
    } catch (error) {
      this.logger.error('Error sending weekly compliance digests:', error);
    }
  }

  /**
   * Send monthly impact summaries
   * Runs on the 1st of every month at 8:00 AM
   *
   * Sends comprehensive monthly report of all active awards and impact
   */
  @Cron('0 8 1 * *', {
    name: 'send-monthly-impact-summary',
    timeZone: 'America/New_York',
  })
  async sendMonthlyImpactSummaries() {
    this.logger.log('Sending monthly impact summaries...');

    try {
      // Get all organizations with active awards
      const organizations = await this.prisma.organization.findMany({
        where: {
          workspaces: {
            some: {
              proposals: {
                some: {
                  award: {
                    status: 'ACTIVE',
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      this.logger.log(
        `Sending monthly summaries to ${organizations.length} organizations`,
      );

      for (const org of organizations) {
        try {
          await this.notificationService.sendMonthlyImpactSummary(org.id);
          this.logger.log(`Sent monthly summary to organization: ${org.name}`);
        } catch (error) {
          this.logger.error(
            `Failed to send monthly summary to organization ${org.id}:`,
            error,
          );
        }
      }

      this.logger.log('Monthly impact summaries completed');
    } catch (error) {
      this.logger.error('Error sending monthly impact summaries:', error);
    }
  }

  /**
   * Check for impact reports that are due soon
   * Runs daily at 11:00 AM
   *
   * Notifies teams about upcoming impact report deadlines
   */
  @Cron('0 11 * * *', {
    name: 'check-impact-report-deadlines',
    timeZone: 'America/New_York',
  })
  async checkImpactReportDeadlines() {
    this.logger.log('Checking for upcoming impact report deadlines...');

    try {
      const now = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(now.getDate() + 14);

      // Find awards with upcoming reporting requirements
      // This is a simplified check - in production, you'd have specific report due dates
      const awards = await this.prisma.grantAward.findMany({
        where: {
          status: 'ACTIVE',
          requirements: {
            some: {
              type: 'IMPACT_REPORT',
              dueDate: {
                gte: now,
                lte: twoWeeksFromNow,
              },
              status: {
                in: ['PENDING', 'IN_PROGRESS'],
              },
            },
          },
        },
        include: {
          requirements: {
            where: {
              type: 'IMPACT_REPORT',
              dueDate: {
                gte: now,
                lte: twoWeeksFromNow,
              },
            },
          },
        },
      });

      this.logger.log(
        `Found ${awards.length} awards with upcoming impact report requirements`,
      );

      for (const award of awards) {
        for (const requirement of award.requirements) {
          try {
            await this.notificationService.notifyImpactReportDue(
              award.id,
              requirement.dueDate,
            );

            this.logger.log(
              `Sent impact report reminder for award: ${award.id}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send impact report reminder for award ${award.id}:`,
              error,
            );
          }
        }
      }

      this.logger.log('Impact report deadline check completed');
    } catch (error) {
      this.logger.error('Error checking impact report deadlines:', error);
    }
  }

  /**
   * Check for document upload requirements
   * Runs daily at 2:00 PM
   *
   * Reminds teams about pending document submissions
   */
  @Cron('0 14 * * *', {
    name: 'check-document-upload-requirements',
    timeZone: 'America/New_York',
  })
  async checkDocumentUploadRequirements() {
    this.logger.log('Checking for pending document upload requirements...');

    try {
      const now = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(now.getDate() + 7);

      // Find requirements that need document uploads
      const requirements = await this.prisma.complianceRequirement.findMany({
        where: {
          type: 'DOCUMENT_SUBMISSION',
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
          dueDate: {
            gte: now,
            lte: oneWeekFromNow,
          },
          documents: {
            none: {}, // No documents uploaded yet
          },
        },
        include: {
          award: {
            include: {
              proposal: true,
            },
          },
        },
      });

      this.logger.log(
        `Found ${requirements.length} requirements needing document uploads`,
      );

      for (const requirement of requirements) {
        try {
          // Only send notification once per day
          const lastReminder = new Date();
          lastReminder.setDate(lastReminder.getDate() - 1);

          if (requirement.remindersSent < 3) {
            await this.notificationService.notifyDocumentUploadRequired(
              requirement.id,
            );

            await this.prisma.complianceRequirement.update({
              where: { id: requirement.id },
              data: {
                remindersSent: {
                  increment: 1,
                },
              },
            });

            this.logger.log(
              `Sent document upload reminder for requirement: ${requirement.title}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to send document upload reminder for requirement ${requirement.id}:`,
            error,
          );
        }
      }

      this.logger.log('Document upload requirements check completed');
    } catch (error) {
      this.logger.error('Error checking document upload requirements:', error);
    }
  }
}
