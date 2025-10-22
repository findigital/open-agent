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
}
