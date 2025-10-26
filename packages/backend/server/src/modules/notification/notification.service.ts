import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private prisma: PrismaService) {
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      this.logger.warn('Email configuration not complete - email notifications disabled');
      this.logger.warn('Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to enable email');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email configuration error:', error);
        this.transporter = null;
      } else {
        this.logger.log('Email service initialized successfully');
      }
    });
  }

  /**
   * Send approval request notification
   */
  async notifyApprovalRequest(approvalId: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const approval = await this.prisma.proposalApproval.findUnique({
        where: { id: approvalId },
        include: {
          approver: true,
          proposal: {
            include: {
              workspace: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (!approval || !approval.approver.email) return;

      const subject = `Approval Requested: ${approval.proposal.title}`;
      const html = this.renderApprovalRequestEmail(approval);

      await this.sendEmail(approval.approver.email, subject, html);

      this.logger.log(`Sent approval request notification to ${approval.approver.email}`);
    } catch (error) {
      this.logger.error('Failed to send approval request notification:', error);
    }
  }

  /**
   * Send approval decision notification
   */
  async notifyApprovalDecision(approvalId: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const approval = await this.prisma.proposalApproval.findUnique({
        where: { id: approvalId },
        include: {
          approver: true,
          proposal: {
            include: {
              workspace: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (!approval) return;

      // Notify proposal creator
      const creator = await this.prisma.user.findUnique({
        where: { id: approval.proposal.createdBy },
      });

      if (!creator || !creator.email) return;

      const subject = `Proposal ${approval.status}: ${approval.proposal.title}`;
      const html = this.renderApprovalDecisionEmail(approval);

      await this.sendEmail(creator.email, subject, html);

      this.logger.log(`Sent approval decision notification to ${creator.email}`);
    } catch (error) {
      this.logger.error('Failed to send approval decision notification:', error);
    }
  }

  /**
   * Send new comment notification
   */
  async notifyNewComment(commentId: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const comment = await this.prisma.proposalComment.findUnique({
        where: { id: commentId },
        include: {
          user: true,
          proposal: {
            include: {
              workspace: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (!comment) return;

      // Notify proposal creator if they didn't write the comment
      if (comment.userId !== comment.proposal.createdBy) {
        const creator = await this.prisma.user.findUnique({
          where: { id: comment.proposal.createdBy },
        });

        if (creator && creator.email) {
          const subject = `New comment on: ${comment.proposal.title}`;
          const html = this.renderNewCommentEmail(comment);

          await this.sendEmail(creator.email, subject, html);
        }
      }

      // Notify other commenters on this proposal (excluding the comment author)
      const otherCommenters = await this.prisma.proposalComment.findMany({
        where: {
          proposalId: comment.proposalId,
          userId: {
            not: comment.userId,
          },
        },
        include: {
          user: true,
        },
        distinct: ['userId'],
      });

      const uniqueEmails = new Set<string>();
      for (const commenter of otherCommenters) {
        if (commenter.user.email) {
          uniqueEmails.add(commenter.user.email);
        }
      }

      for (const email of uniqueEmails) {
        const subject = `New comment on: ${comment.proposal.title}`;
        const html = this.renderNewCommentEmail(comment);
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent new comment notifications for comment ${commentId}`);
    } catch (error) {
      this.logger.error('Failed to send comment notification:', error);
    }
  }

  /**
   * Send proposal status change notification
   */
  async notifyProposalStatusChange(proposalId: string, oldStatus: string, newStatus: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          workspace: {
            include: {
              organization: {
                include: {
                  members: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!proposal) return;

      // Notify organization admins and owners
      const recipients = proposal.workspace.organization.members
        .filter(m => (m.role === 'owner' || m.role === 'admin') && m.user.email)
        .map(m => m.user.email!);

      if (recipients.length === 0) return;

      const subject = `Proposal Status Update: ${proposal.title}`;
      const html = this.renderStatusChangeEmail(proposal, oldStatus, newStatus);

      for (const email of recipients) {
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent status change notifications for proposal ${proposalId}`);
    } catch (error) {
      this.logger.error('Failed to send status change notification:', error);
    }
  }

  /**
   * Send AI generation complete notification
   */
  async notifyAiGenerationComplete(proposalId: string, sectionId: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: proposalId },
      });

      if (!proposal) return;

      const creator = await this.prisma.user.findUnique({
        where: { id: proposal.createdBy },
      });

      if (!creator || !creator.email) return;

      const section = await this.prisma.proposalSection.findUnique({
        where: { id: sectionId },
      });

      if (!section) return;

      const subject = `AI Generated Content Ready: ${section.title}`;
      const html = this.renderAiGenerationEmail(proposal, section);

      await this.sendEmail(creator.email, subject, html);

      this.logger.log(`Sent AI generation notification to ${creator.email}`);
    } catch (error) {
      this.logger.error('Failed to send AI generation notification:', error);
    }
  }

  /**
   * Send email
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not available');
      return;
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Render approval request email
   */
  private renderApprovalRequestEmail(approval: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Approval Requested</h1>
    </div>
    <div class="content">
      <p>Hi ${approval.approver.name},</p>

      <p>You have been requested to review and approve a proposal:</p>

      <p><strong>${approval.proposal.title}</strong></p>

      <p><strong>Organization:</strong> ${approval.proposal.workspace.organization.name}</p>
      <p><strong>Workspace:</strong> ${approval.proposal.workspace.name}</p>
      ${approval.proposal.dueDate ? `<p><strong>Due Date:</strong> ${new Date(approval.proposal.dueDate).toLocaleDateString()}</p>` : ''}

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${approval.proposalId}" class="button">
        Review Proposal
      </a>

      <p>Please review the proposal and provide your approval decision.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Proposal Writing SaaS</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render approval decision email
   */
  private renderApprovalDecisionEmail(approval: any): string {
    const statusEmoji = approval.status === 'approved' ? '✅' : approval.status === 'rejected' ? '❌' : '⚠️';
    const statusColor = approval.status === 'approved' ? '#10B981' : approval.status === 'rejected' ? '#EF4444' : '#F59E0B';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .status { background: ${statusColor}; color: white; padding: 10px; border-radius: 5px; display: inline-block; }
    .comment { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
    .button { display: inline-block; background: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusEmoji} Approval Decision</h1>
    </div>
    <div class="content">
      <p>Your proposal has received an approval decision:</p>

      <p><strong>${approval.proposal.title}</strong></p>

      <p><span class="status">${approval.status.toUpperCase()}</span></p>

      <p><strong>Reviewer:</strong> ${approval.approver.name}</p>

      ${approval.comment ? `
        <div class="comment">
          <strong>Comment:</strong><br>
          ${approval.comment}
        </div>
      ` : ''}

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${approval.proposalId}" class="button">
        View Proposal
      </a>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render new comment email
   */
  private renderNewCommentEmail(comment: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .comment { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4F46E5; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 New Comment</h1>
    </div>
    <div class="content">
      <p><strong>${comment.user.name}</strong> commented on:</p>

      <p><strong>${comment.proposal.title}</strong></p>

      <div class="comment">
        ${comment.content}
      </div>

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${comment.proposalId}#comment-${comment.id}" class="button">
        View Comment
      </a>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render status change email
   */
  private renderStatusChangeEmail(proposal: any, oldStatus: string, newStatus: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .status-change { background: white; padding: 15px; margin: 15px 0; text-align: center; }
    .status { display: inline-block; padding: 8px 16px; border-radius: 5px; background: #E5E7EB; }
    .arrow { margin: 0 10px; font-size: 20px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Status Update</h1>
    </div>
    <div class="content">
      <p>Proposal status has changed:</p>

      <p><strong>${proposal.title}</strong></p>

      <div class="status-change">
        <span class="status">${oldStatus}</span>
        <span class="arrow">→</span>
        <span class="status">${newStatus}</span>
      </div>

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${proposal.id}" class="button">
        View Proposal
      </a>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render AI generation email
   */
  private renderAiGenerationEmail(proposal: any, section: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 AI Generation Complete</h1>
    </div>
    <div class="content">
      <p>Your AI-generated content is ready!</p>

      <p><strong>Proposal:</strong> ${proposal.title}</p>
      <p><strong>Section:</strong> ${section.title}</p>
      <p><strong>Word Count:</strong> ${section.content.split(/\s+/).filter((w: string) => w.length > 0).length} words</p>

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${proposal.id}#section-${section.id}" class="button">
        Review Content
      </a>

      <p>The AI has analyzed your organization's documents and grant requirements to create compelling content. Please review and edit as needed.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // ============================================================================
  // Grant Lifecycle Compliance Notifications
  // ============================================================================

  /**
   * Send compliance deadline approaching notification
   */
  async notifyComplianceDeadlineApproaching(requirementId: string, daysUntil: number): Promise<void> {
    if (!this.transporter) return;

    try {
      const requirement = await this.prisma.complianceRequirement.findUnique({
        where: { id: requirementId },
        include: {
          award: {
            include: {
              proposal: {
                include: {
                  workspace: {
                    include: {
                      organization: {
                        include: {
                          members: {
                            where: {
                              role: {
                                in: ['owner', 'admin'],
                              },
                            },
                            include: {
                              user: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!requirement) return;

      const recipients = requirement.award.proposal.workspace.organization.members
        .filter(m => m.user.email)
        .map(m => m.user.email!);

      if (recipients.length === 0) return;

      const urgency = daysUntil <= 3 ? 'URGENT' : 'UPCOMING';
      const subject = `${urgency}: Compliance Deadline in ${daysUntil} ${daysUntil === 1 ? 'Day' : 'Days'}`;
      const html = this.renderComplianceDeadlineEmail(requirement, daysUntil);

      for (const email of recipients) {
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent compliance deadline notifications for requirement ${requirementId}`);
    } catch (error) {
      this.logger.error('Failed to send compliance deadline notification:', error);
    }
  }

  /**
   * Send compliance overdue notification
   */
  async notifyComplianceOverdue(requirementId: string, daysPastDue: number): Promise<void> {
    if (!this.transporter) return;

    try {
      const requirement = await this.prisma.complianceRequirement.findUnique({
        where: { id: requirementId },
        include: {
          award: {
            include: {
              proposal: {
                include: {
                  workspace: {
                    include: {
                      organization: {
                        include: {
                          members: {
                            where: {
                              role: {
                                in: ['owner', 'admin'],
                              },
                            },
                            include: {
                              user: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!requirement) return;

      const recipients = requirement.award.proposal.workspace.organization.members
        .filter(m => m.user.email)
        .map(m => m.user.email!);

      if (recipients.length === 0) return;

      const subject = `⚠️ OVERDUE: Compliance Requirement Past Due`;
      const html = this.renderComplianceOverdueEmail(requirement, daysPastDue);

      for (const email of recipients) {
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent compliance overdue notifications for requirement ${requirementId}`);
    } catch (error) {
      this.logger.error('Failed to send compliance overdue notification:', error);
    }
  }

  /**
   * Send document upload required notification
   */
  async notifyDocumentUploadRequired(requirementId: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const requirement = await this.prisma.complianceRequirement.findUnique({
        where: { id: requirementId },
        include: {
          award: {
            include: {
              proposal: {
                include: {
                  workspace: {
                    include: {
                      organization: {
                        include: {
                          members: {
                            where: {
                              role: {
                                in: ['owner', 'admin'],
                              },
                            },
                            include: {
                              user: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!requirement) return;

      const recipients = requirement.award.proposal.workspace.organization.members
        .filter(m => m.user.email)
        .map(m => m.user.email!);

      if (recipients.length === 0) return;

      const subject = `📎 Document Upload Required: ${requirement.title}`;
      const html = this.renderDocumentUploadEmail(requirement);

      for (const email of recipients) {
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent document upload notifications for requirement ${requirementId}`);
    } catch (error) {
      this.logger.error('Failed to send document upload notification:', error);
    }
  }

  /**
   * Send impact report due notification
   */
  async notifyImpactReportDue(awardId: string, dueDate: Date): Promise<void> {
    if (!this.transporter) return;

    try {
      const award = await this.prisma.grantAward.findUnique({
        where: { id: awardId },
        include: {
          proposal: {
            include: {
              workspace: {
                include: {
                  organization: {
                    include: {
                      members: {
                        where: {
                          role: {
                            in: ['owner', 'admin'],
                          },
                        },
                        include: {
                          user: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!award) return;

      const recipients = award.proposal.workspace.organization.members
        .filter(m => m.user.email)
        .map(m => m.user.email!);

      if (recipients.length === 0) return;

      const subject = `📊 Impact Report Due: ${award.proposal.title}`;
      const html = this.renderImpactReportDueEmail(award, dueDate);

      for (const email of recipients) {
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent impact report due notifications for award ${awardId}`);
    } catch (error) {
      this.logger.error('Failed to send impact report due notification:', error);
    }
  }

  /**
   * Send weekly compliance digest
   */
  async sendWeeklyComplianceDigest(organizationId: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          members: {
            where: {
              role: {
                in: ['owner', 'admin'],
              },
            },
            include: {
              user: true,
            },
          },
        },
      });

      if (!organization) return;

      // Get compliance data for the week
      const now = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(now.getDate() + 7);

      const upcomingRequirements = await this.prisma.complianceRequirement.findMany({
        where: {
          award: {
            proposal: {
              workspace: {
                organizationId,
              },
            },
          },
          dueDate: {
            gte: now,
            lte: oneWeekFromNow,
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
        orderBy: {
          dueDate: 'asc',
        },
      });

      const overdueRequirements = await this.prisma.complianceRequirement.findMany({
        where: {
          award: {
            proposal: {
              workspace: {
                organizationId,
              },
            },
          },
          dueDate: {
            lt: now,
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'],
          },
        },
        include: {
          award: {
            include: {
              proposal: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      const recentlyCompleted = await this.prisma.complianceRequirement.findMany({
        where: {
          award: {
            proposal: {
              workspace: {
                organizationId,
              },
            },
          },
          completedDate: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
          status: {
            in: ['SUBMITTED', 'APPROVED'],
          },
        },
        include: {
          award: {
            include: {
              proposal: true,
            },
          },
        },
        orderBy: {
          completedDate: 'desc',
        },
        take: 10,
      });

      const recipients = organization.members
        .filter(m => m.user.email)
        .map(m => m.user.email!);

      if (recipients.length === 0) return;

      const subject = `📅 Weekly Compliance Digest - ${organization.name}`;
      const html = this.renderWeeklyDigestEmail(
        organization,
        upcomingRequirements,
        overdueRequirements,
        recentlyCompleted
      );

      for (const email of recipients) {
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent weekly compliance digest to ${organization.name}`);
    } catch (error) {
      this.logger.error('Failed to send weekly compliance digest:', error);
    }
  }

  /**
   * Send monthly impact summary
   */
  async sendMonthlyImpactSummary(organizationId: string): Promise<void> {
    if (!this.transporter) return;

    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          members: {
            where: {
              role: {
                in: ['owner', 'admin'],
              },
            },
            include: {
              user: true,
            },
          },
        },
      });

      if (!organization) return;

      const now = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Get active awards count
      const activeAwards = await this.prisma.grantAward.findMany({
        where: {
          proposal: {
            workspace: {
              organizationId,
            },
          },
          status: 'ACTIVE',
        },
        include: {
          proposal: true,
        },
      });

      // Get reports submitted last month
      const reportsSubmitted = await this.prisma.impactReport.findMany({
        where: {
          award: {
            proposal: {
              workspace: {
                organizationId,
              },
            },
          },
          submittedAt: {
            gte: lastMonth,
            lt: now,
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

      const recipients = organization.members
        .filter(m => m.user.email)
        .map(m => m.user.email!);

      if (recipients.length === 0) return;

      const subject = `📊 Monthly Impact Summary - ${organization.name}`;
      const html = this.renderMonthlyImpactEmail(
        organization,
        activeAwards,
        reportsSubmitted
      );

      for (const email of recipients) {
        await this.sendEmail(email, subject, html);
      }

      this.logger.log(`Sent monthly impact summary to ${organization.name}`);
    } catch (error) {
      this.logger.error('Failed to send monthly impact summary:', error);
    }
  }

  // ============================================================================
  // Email Templates for Grant Lifecycle
  // ============================================================================

  /**
   * Render compliance deadline email
   */
  private renderComplianceDeadlineEmail(requirement: any, daysUntil: number): string {
    const isUrgent = daysUntil <= 3;
    const headerColor = isUrgent ? '#EF4444' : '#F59E0B';
    const icon = isUrgent ? '🚨' : '⏰';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .requirement { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${headerColor}; }
    .deadline { background: ${headerColor}; color: white; padding: 10px; border-radius: 5px; display: inline-block; font-weight: bold; }
    .button { display: inline-block; background: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${icon} Compliance Deadline Approaching</h1>
    </div>
    <div class="content">
      <p>This is a reminder that a compliance requirement is due soon:</p>

      <div class="requirement">
        <h3>${requirement.title}</h3>
        <p><strong>Type:</strong> ${requirement.type.replace(/_/g, ' ')}</p>
        <p><strong>Description:</strong> ${requirement.description}</p>
        <p><strong>Grant:</strong> ${requirement.award.proposal.title}</p>
      </div>

      <p style="text-align: center;">
        <span class="deadline">Due in ${daysUntil} ${daysUntil === 1 ? 'Day' : 'Days'}</span>
      </p>

      <p><strong>Due Date:</strong> ${new Date(requirement.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      ${isUrgent ? '<p style="color: #EF4444; font-weight: bold;">⚠️ This is an urgent deadline. Please take immediate action.</p>' : ''}

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${requirement.award.proposalId}/award" class="button">
        View Award Dashboard
      </a>

      <p>Please ensure all required documents are uploaded and the requirement is completed on time.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render compliance overdue email
   */
  private renderComplianceOverdueEmail(requirement: any, daysPastDue: number): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .requirement { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #DC2626; }
    .overdue { background: #DC2626; color: white; padding: 10px; border-radius: 5px; display: inline-block; font-weight: bold; }
    .button { display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .warning { background: #FEE2E2; border: 2px solid #DC2626; padding: 15px; margin: 15px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ OVERDUE COMPLIANCE REQUIREMENT</h1>
    </div>
    <div class="content">
      <div class="warning">
        <p style="margin: 0; font-weight: bold; color: #DC2626;">URGENT: This compliance requirement is past due and requires immediate attention.</p>
      </div>

      <div class="requirement">
        <h3>${requirement.title}</h3>
        <p><strong>Type:</strong> ${requirement.type.replace(/_/g, ' ')}</p>
        <p><strong>Description:</strong> ${requirement.description}</p>
        <p><strong>Grant:</strong> ${requirement.award.proposal.title}</p>
      </div>

      <p style="text-align: center;">
        <span class="overdue">${daysPastDue} ${daysPastDue === 1 ? 'Day' : 'Days'} Overdue</span>
      </p>

      <p><strong>Original Due Date:</strong> ${new Date(requirement.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${requirement.award.proposalId}/award" class="button">
        Take Action Now
      </a>

      <p>Please complete this requirement as soon as possible to maintain good standing with the funder.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render document upload email
   */
  private renderDocumentUploadEmail(requirement: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .requirement { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3B82F6; }
    .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📎 Document Upload Required</h1>
    </div>
    <div class="content">
      <p>Please upload the required documents for the following compliance requirement:</p>

      <div class="requirement">
        <h3>${requirement.title}</h3>
        <p><strong>Type:</strong> ${requirement.type.replace(/_/g, ' ')}</p>
        <p><strong>Description:</strong> ${requirement.description}</p>
        <p><strong>Grant:</strong> ${requirement.award.proposal.title}</p>
        <p><strong>Due Date:</strong> ${new Date(requirement.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${requirement.award.proposalId}/award" class="button">
        Upload Documents
      </a>

      <p>Make sure to upload all necessary documents before the deadline to ensure timely compliance.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render impact report due email
   */
  private renderImpactReportDueEmail(award: any, dueDate: Date): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .award { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #8B5CF6; }
    .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Impact Report Due</h1>
    </div>
    <div class="content">
      <p>It's time to submit an impact report for the following grant award:</p>

      <div class="award">
        <h3>${award.proposal.title}</h3>
        <p><strong>Award Amount:</strong> $${award.awardAmount.toLocaleString()}</p>
        <p><strong>Organization:</strong> ${award.proposal.workspace.organization.name}</p>
        <p><strong>Report Due:</strong> ${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals/${award.proposalId}/award/impact-report/new" class="button">
        Create Impact Report
      </a>

      <p>Use our AI-powered report builder to create a compelling impact report that showcases your organization's achievements.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render weekly compliance digest email
   */
  private renderWeeklyDigestEmail(
    organization: any,
    upcomingRequirements: any[],
    overdueRequirements: any[],
    recentlyCompleted: any[]
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .section { margin: 20px 0; }
    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #4F46E5; }
    .item { background: white; padding: 12px; margin: 8px 0; border-left: 4px solid #4F46E5; }
    .overdue { border-left-color: #EF4444; }
    .completed { border-left-color: #10B981; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .stats { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; text-align: center; }
    .stat { display: inline-block; margin: 10px 20px; }
    .stat-number { font-size: 24px; font-weight: bold; color: #4F46E5; }
    .stat-label { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Weekly Compliance Digest</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${organization.name}</p>
    </div>
    <div class="content">
      <p>Here's your weekly compliance summary:</p>

      <div class="stats">
        <div class="stat">
          <div class="stat-number" style="color: #EF4444;">${overdueRequirements.length}</div>
          <div class="stat-label">Overdue</div>
        </div>
        <div class="stat">
          <div class="stat-number" style="color: #F59E0B;">${upcomingRequirements.length}</div>
          <div class="stat-label">Due This Week</div>
        </div>
        <div class="stat">
          <div class="stat-number" style="color: #10B981;">${recentlyCompleted.length}</div>
          <div class="stat-label">Recently Completed</div>
        </div>
      </div>

      ${overdueRequirements.length > 0 ? `
        <div class="section">
          <div class="section-title" style="color: #EF4444;">🔴 Overdue (${overdueRequirements.length})</div>
          ${overdueRequirements.map(req => `
            <div class="item overdue">
              <strong>${req.title}</strong><br>
              <small>${req.award.proposal.title} • ${Math.floor((new Date().getTime() - new Date(req.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue</small>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${upcomingRequirements.length > 0 ? `
        <div class="section">
          <div class="section-title" style="color: #F59E0B;">⚠️ Due This Week (${upcomingRequirements.length})</div>
          ${upcomingRequirements.map(req => `
            <div class="item">
              <strong>${req.title}</strong><br>
              <small>${req.award.proposal.title} • Due ${new Date(req.dueDate).toLocaleDateString()}</small>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${recentlyCompleted.length > 0 ? `
        <div class="section">
          <div class="section-title" style="color: #10B981;">✅ Recently Completed (${recentlyCompleted.length})</div>
          ${recentlyCompleted.map(req => `
            <div class="item completed">
              <strong>${req.title}</strong><br>
              <small>${req.award.proposal.title} • Completed ${new Date(req.completedDate!).toLocaleDateString()}</small>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${overdueRequirements.length === 0 && upcomingRequirements.length === 0 ? `
        <p style="text-align: center; color: #10B981; font-weight: bold;">🎉 Great job! You're all caught up on compliance requirements.</p>
      ` : ''}

      <div style="text-align: center;">
        <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals" class="button">
          View All Awards
        </a>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render monthly impact summary email
   */
  private renderMonthlyImpactEmail(
    organization: any,
    activeAwards: any[],
    reportsSubmitted: any[]
  ): string {
    const totalAwardAmount = activeAwards.reduce((sum, award) => sum + parseFloat(award.awardAmount.toString()), 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .stats { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; }
    .stat { margin: 15px 0; padding: 15px; background: #F0FDF4; border-left: 4px solid #10B981; }
    .stat-number { font-size: 32px; font-weight: bold; color: #10B981; }
    .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
    .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Monthly Impact Summary</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${organization.name}</p>
    </div>
    <div class="content">
      <p>Here's your monthly impact at a glance:</p>

      <div class="stats">
        <div class="stat">
          <div class="stat-number">${activeAwards.length}</div>
          <div class="stat-label">Active Grant Awards</div>
        </div>

        <div class="stat">
          <div class="stat-number">$${totalAwardAmount.toLocaleString()}</div>
          <div class="stat-label">Total Active Funding</div>
        </div>

        <div class="stat">
          <div class="stat-number">${reportsSubmitted.length}</div>
          <div class="stat-label">Reports Submitted This Month</div>
        </div>
      </div>

      ${activeAwards.length > 0 ? `
        <h3>Active Grants:</h3>
        <ul>
          ${activeAwards.map(award => `
            <li><strong>${award.proposal.title}</strong> - $${parseFloat(award.awardAmount.toString()).toLocaleString()}</li>
          `).join('')}
        </ul>
      ` : ''}

      <div style="text-align: center;">
        <a href="${process.env.OPEN_AGENT_SERVER_EXTERNAL_URL}/proposals" class="button">
          View Dashboard
        </a>
      </div>

      <p style="margin-top: 20px; font-size: 14px; color: #666;">Keep up the great work! Your organization's impact continues to grow.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
