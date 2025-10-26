import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { ImpactReport } from '@prisma/client';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * ImpactReportPdfService
 *
 * Generates professional PDF exports of impact reports using Python reportlab.
 * Creates beautifully formatted reports with proper typography, layout, and styling.
 */
@Injectable()
export class ImpactReportPdfService {
  private readonly logger = new Logger(ImpactReportPdfService.name);
  private readonly tempDir = '/tmp';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate PDF for an impact report
   * Returns the path to the generated PDF file
   */
  async generatePdf(reportId: string, userId: string): Promise<string> {
    this.logger.log(`Generating PDF for report ${reportId}`);

    // Get report with full data
    const report = await this.prisma.impactReport.findUnique({
      where: { id: reportId },
      include: {
        award: {
          include: {
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
        },
        documents: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Impact report not found');
    }

    // Verify user has access
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: report.award.proposal.workspace.organizationId,
        userId,
      },
    });

    if (!member) {
      throw new NotFoundException('Access denied');
    }

    // Generate PDF using Python script
    const pdfPath = await this.generatePdfWithReportlab(report);

    return pdfPath;
  }

  /**
   * Generate PDF using Python reportlab
   */
  private async generatePdfWithReportlab(report: any): Promise<string> {
    const timestamp = Date.now();
    const outputPath = join(this.tempDir, `impact-report-${report.id}-${timestamp}.pdf`);
    const scriptPath = join(this.tempDir, `pdf-script-${timestamp}.py`);

    // Create Python script for PDF generation
    const pythonScript = this.generatePythonScript(report, outputPath);

    try {
      // Write Python script to temp file
      await writeFile(scriptPath, pythonScript);

      // Execute Python script
      await this.executePythonScript(scriptPath);

      // Clean up script file
      await unlink(scriptPath);

      this.logger.log(`Generated PDF: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error('Failed to generate PDF:', error);
      // Clean up on error
      try {
        await unlink(scriptPath);
      } catch {}
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Generate Python script for creating the PDF
   */
  private generatePythonScript(report: any, outputPath: string): string {
    const org = report.award.proposal.workspace.organization;
    const award = report.award;
    const proposal = award.proposal;

    // Escape strings for Python
    const escape = (str: string | null | undefined) => {
      if (!str) return '';
      return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    };

    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from datetime import datetime

# Document setup
doc = SimpleDocTemplate(
    "${outputPath}",
    pagesize=letter,
    rightMargin=0.75*inch,
    leftMargin=0.75*inch,
    topMargin=0.75*inch,
    bottomMargin=0.75*inch
)

# Styles
styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#1a56db'),
    spaceAfter=12,
    alignment=TA_CENTER
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=16,
    textColor=colors.HexColor('#1a56db'),
    spaceBefore=20,
    spaceAfter=12,
    borderPadding=10
)

subheading_style = ParagraphStyle(
    'CustomSubheading',
    parent=styles['Heading3'],
    fontSize=12,
    textColor=colors.HexColor('#4b5563'),
    spaceBefore=12,
    spaceAfter=6
)

body_style = ParagraphStyle(
    'CustomBody',
    parent=styles['Normal'],
    fontSize=10,
    leading=14,
    alignment=TA_JUSTIFY,
    spaceAfter=12
)

# Build document content
story = []

# Cover Page
story.append(Spacer(1, 2*inch))
story.append(Paragraph("IMPACT REPORT", title_style))
story.append(Spacer(1, 0.5*inch))

# Organization and Program
story.append(Paragraph("${escape(org.name)}", ParagraphStyle(
    'OrgName',
    parent=styles['Normal'],
    fontSize=18,
    textColor=colors.HexColor('#374151'),
    alignment=TA_CENTER,
    spaceAfter=6
)))

story.append(Paragraph("${escape(proposal.title)}", ParagraphStyle(
    'ProgramName',
    parent=styles['Normal'],
    fontSize=14,
    textColor=colors.HexColor('#6b7280'),
    alignment=TA_CENTER,
    spaceAfter=30
)))

# Reporting Period
period_start = "${new Date(report.reportingPeriodStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}"
period_end = "${new Date(report.reportingPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}"

story.append(Paragraph(f"Reporting Period: {period_start} - {period_end}", ParagraphStyle(
    'Period',
    parent=styles['Normal'],
    fontSize=11,
    textColor=colors.HexColor('#6b7280'),
    alignment=TA_CENTER
)))

# Quality Score (if available)
${report.qualityScore ? `
story.append(Spacer(1, 0.5*inch))
quality_score = ${report.qualityScore}
quality_color = colors.HexColor('#10b981') if quality_score >= 80 else (colors.HexColor('#f59e0b') if quality_score >= 60 else colors.HexColor('#ef4444'))
story.append(Paragraph(f"Quality Score: {quality_score}%", ParagraphStyle(
    'Quality',
    parent=styles['Normal'],
    fontSize=14,
    textColor=quality_color,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
)))
` : ''}

story.append(PageBreak())

# Executive Summary (if available)
${report.aiGeneratedSummary ? `
story.append(Paragraph("Executive Summary", heading_style))
story.append(Paragraph("${escape(report.aiGeneratedSummary)}", body_style))
story.append(Spacer(1, 0.3*inch))
` : ''}

# Key Metrics
story.append(Paragraph("Key Metrics", heading_style))

metrics_data = [
    ['Metric', 'Value'],
    ['People Served', '${report.peopleServed || 'N/A'}'],
    ['Programs Delivered', '${report.programsDelivered || 'N/A'}'],
    ['Award Amount', '$${award.awardAmount ? award.awardAmount.toLocaleString() : 'N/A'}'],
]

metrics_table = Table(metrics_data, colWidths=[3*inch, 2*inch])
metrics_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 12),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('TOPPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 10),
    ('TOPPADDING', (0, 1), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
]))

story.append(metrics_table)
story.append(Spacer(1, 0.3*inch))

${report.challenges ? `
# Challenges
story.append(Paragraph("Challenges", heading_style))
story.append(Paragraph("${escape(report.challenges)}", body_style))
story.append(Spacer(1, 0.2*inch))
` : ''}

${report.successes ? `
# Successes
story.append(Paragraph("Successes", heading_style))
story.append(Paragraph("${escape(report.successes)}", body_style))
story.append(Spacer(1, 0.2*inch))
` : ''}

${report.storiesOfImpact ? `
# Stories of Impact
story.append(PageBreak())
story.append(Paragraph("Stories of Impact", heading_style))
story.append(Paragraph("${escape(report.storiesOfImpact)}", body_style))
story.append(Spacer(1, 0.2*inch))
` : ''}

${report.lessonsLearned ? `
# Lessons Learned
story.append(Paragraph("Lessons Learned", heading_style))
story.append(Paragraph("${escape(report.lessonsLearned)}", body_style))
story.append(Spacer(1, 0.2*inch))
` : ''}

# Footer information
story.append(PageBreak())
story.append(Paragraph("Report Information", heading_style))

info_data = [
    ['Organization', '${escape(org.name)}'],
    ['Program', '${escape(proposal.title)}'],
    ['Award Amount', '$${award.awardAmount ? award.awardAmount.toLocaleString() : 'N/A'}'],
    ['Report Status', '${report.status}'],
    ['Generated', datetime.now().strftime('%B %d, %Y at %I:%M %p')],
]

info_table = Table(info_data, colWidths=[2*inch, 4*inch])
info_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
]))

story.append(info_table)

# Build PDF
doc.build(story)
print("PDF generated successfully")
`;
  }

  /**
   * Execute Python script
   */
  private executePythonScript(scriptPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [scriptPath]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Python script failed: ${stderr}`);
          reject(new Error(`PDF generation failed: ${stderr}`));
        } else {
          this.logger.log(`Python script output: ${stdout}`);
          resolve();
        }
      });

      python.on('error', (error) => {
        this.logger.error(`Failed to spawn Python process: ${error}`);
        reject(error);
      });
    });
  }
}
