import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * GrantExcelService
 *
 * Generates Excel spreadsheets for grant portfolio management.
 * Creates professional Excel workbooks with formulas, formatting, and visualizations.
 */
@Injectable()
export class GrantExcelService {
  private readonly logger = new Logger(GrantExcelService.name);
  private readonly tempDir = '/tmp';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export grant portfolio to Excel
   * Returns path to generated Excel file
   */
  async exportGrantPortfolio(
    organizationId: string,
    userId: string,
  ): Promise<string> {
    this.logger.log(`Generating grant portfolio Excel for org ${organizationId}`);

    // Verify user has access
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!member) {
      throw new NotFoundException('Access denied');
    }

    // Get all proposals for organization
    const proposals = await this.prisma.proposal.findMany({
      where: {
        workspace: {
          organizationId,
        },
      },
      include: {
        workspace: true,
        award: {
          include: {
            requirements: true,
            reports: true,
          },
        },
        template: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get organization details
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    // Generate Excel file
    const excelPath = await this.generateExcelWithOpenpyxl(
      organization!,
      proposals,
    );

    return excelPath;
  }

  /**
   * Export budget template for a proposal
   */
  async exportBudgetTemplate(
    proposalId: string,
    userId: string,
  ): Promise<string> {
    this.logger.log(`Generating budget template for proposal ${proposalId}`);

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
        award: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Verify access
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: proposal.workspace.organizationId,
        userId,
      },
    });

    if (!member) {
      throw new NotFoundException('Access denied');
    }

    // Generate budget Excel
    const excelPath = await this.generateBudgetExcel(proposal);

    return excelPath;
  }

  /**
   * Generate grant portfolio Excel using Python openpyxl
   */
  private async generateExcelWithOpenpyxl(
    organization: any,
    proposals: any[],
  ): Promise<string> {
    const timestamp = Date.now();
    const outputPath = join(
      this.tempDir,
      `grant-portfolio-${organization.id}-${timestamp}.xlsx`,
    );
    const scriptPath = join(this.tempDir, `excel-script-${timestamp}.py`);

    // Create Python script
    const pythonScript = this.generatePortfolioPythonScript(
      organization,
      proposals,
      outputPath,
    );

    try {
      await writeFile(scriptPath, pythonScript);
      await this.executePythonScript(scriptPath);
      await unlink(scriptPath);

      this.logger.log(`Generated Excel: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error('Failed to generate Excel:', error);
      try {
        await unlink(scriptPath);
      } catch {}
      throw new Error('Failed to generate Excel spreadsheet');
    }
  }

  /**
   * Generate budget template Excel
   */
  private async generateBudgetExcel(proposal: any): Promise<string> {
    const timestamp = Date.now();
    const outputPath = join(
      this.tempDir,
      `budget-${proposal.id}-${timestamp}.xlsx`,
    );
    const scriptPath = join(this.tempDir, `budget-script-${timestamp}.py`);

    const pythonScript = this.generateBudgetPythonScript(proposal, outputPath);

    try {
      await writeFile(scriptPath, pythonScript);
      await this.executePythonScript(scriptPath);
      await unlink(scriptPath);

      this.logger.log(`Generated budget Excel: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error('Failed to generate budget Excel:', error);
      try {
        await unlink(scriptPath);
      } catch {}
      throw new Error('Failed to generate budget template');
    }
  }

  /**
   * Generate Python script for portfolio export
   */
  private generatePortfolioPythonScript(
    organization: any,
    proposals: any[],
    outputPath: string,
  ): string {
    const escape = (str: string | null | undefined) => {
      if (!str) return '';
      return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    };

    // Calculate summary statistics
    const totalProposals = proposals.length;
    const submittedProposals = proposals.filter((p) => p.status === 'submitted' || p.status === 'awarded').length;
    const awardedProposals = proposals.filter((p) => p.status === 'awarded').length;
    const totalRequested = proposals.reduce((sum, p) => sum + (p.requestedAmount || 0), 0);
    const totalAwarded = proposals.reduce((sum, p) => sum + (p.awardedAmount || 0), 0);
    const activeAwards = proposals.filter((p) => p.award && p.award.status === 'ACTIVE').length;

    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime
import json

# Create workbook
wb = Workbook()

# Remove default sheet
if 'Sheet' in wb.sheetnames:
    wb.remove(wb['Sheet'])

#############
# SUMMARY TAB
#############
ws_summary = wb.create_sheet("Summary", 0)

# Title
ws_summary['A1'] = "${escape(organization.name)}"
ws_summary['A1'].font = Font(size=18, bold=True, color="1E3A8A")
ws_summary['A2'] = "Grant Portfolio Summary"
ws_summary['A2'].font = Font(size=14, color="6B7280")
ws_summary['A3'] = f"Generated: {datetime.now().strftime('%B %d, %Y')}"
ws_summary['A3'].font = Font(size=10, color="9CA3AF")

# Key Metrics
row = 5
metrics = [
    ("Total Proposals", ${totalProposals}),
    ("Submitted Proposals", ${submittedProposals}),
    ("Awarded Grants", ${awardedProposals}),
    ("Total Requested", ${totalRequested}),
    ("Total Awarded", ${totalAwarded}),
    ("Active Awards", ${activeAwards}),
]

for label, value in metrics:
    ws_summary[f'A{row}'] = label
    ws_summary[f'A{row}'].font = Font(bold=True)

    if 'Total' in label or 'Requested' in label or 'Awarded' in label:
        ws_summary[f'B{row}'] = value
        ws_summary[f'B{row}'].number_format = '$#,##0'
        ws_summary[f'B{row}'].font = Font(color="0000FF", bold=True)
    else:
        ws_summary[f'B{row}'] = value
        ws_summary[f'B{row}'].font = Font(color="0000FF", bold=True)

    row += 1

# Column widths
ws_summary.column_dimensions['A'].width = 25
ws_summary.column_dimensions['B'].width = 20

#############
# GRANTS TAB
#############
ws_grants = wb.create_sheet("Grants", 1)

# Headers
headers = ["Status", "Title", "Funder", "Requested", "Awarded", "Submitted Date", "Award Date", "Project Start", "Project End", "Workspace"]
for col, header in enumerate(headers, 1):
    cell = ws_grants.cell(1, col, header)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
    cell.alignment = Alignment(horizontal="center")

# Proposal data
proposals_data = ${JSON.stringify(proposals.map(p => ({
  status: p.status,
  title: p.title,
  funder: p.funderName || 'N/A',
  requestedAmount: p.requestedAmount || 0,
  awardedAmount: p.awardedAmount || 0,
  submittedDate: p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '',
  awardDate: p.award ? new Date(p.award.awardDate).toLocaleDateString() : '',
  projectStart: p.award ? new Date(p.award.projectStartDate).toLocaleDateString() : '',
  projectEnd: p.award ? new Date(p.award.projectEndDate).toLocaleDateString() : '',
  workspace: p.workspace.name,
})))}

for row_idx, proposal in enumerate(proposals_data, 2):
    ws_grants.cell(row_idx, 1, proposal['status'])
    ws_grants.cell(row_idx, 2, proposal['title'])
    ws_grants.cell(row_idx, 3, proposal['funder'])

    # Requested amount (blue)
    cell_req = ws_grants.cell(row_idx, 4, proposal['requestedAmount'])
    cell_req.number_format = '$#,##0;($#,##0);-'
    cell_req.font = Font(color="0000FF")

    # Awarded amount (black with formula reference)
    cell_award = ws_grants.cell(row_idx, 5, proposal['awardedAmount'])
    cell_award.number_format = '$#,##0;($#,##0);-'

    ws_grants.cell(row_idx, 6, proposal['submittedDate'])
    ws_grants.cell(row_idx, 7, proposal['awardDate'])
    ws_grants.cell(row_idx, 8, proposal['projectStart'])
    ws_grants.cell(row_idx, 9, proposal['projectEnd'])
    ws_grants.cell(row_idx, 10, proposal['workspace'])

# Column widths
ws_grants.column_dimensions['A'].width = 12
ws_grants.column_dimensions['B'].width = 35
ws_grants.column_dimensions['C'].width = 25
ws_grants.column_dimensions['D'].width = 12
ws_grants.column_dimensions['E'].width = 12
ws_grants.column_dimensions['F'].width = 14
ws_grants.column_dimensions['G'].width = 14
ws_grants.column_dimensions['H'].width = 14
ws_grants.column_dimensions['I'].width = 14
ws_grants.column_dimensions['J'].width = 20

# Freeze header row
ws_grants.freeze_panes = 'A2'

# Add totals row
total_row = len(proposals_data) + 2
ws_grants.cell(total_row, 3, "TOTALS")
ws_grants.cell(total_row, 3).font = Font(bold=True)

# Total requested formula
ws_grants.cell(total_row, 4, f"=SUM(D2:D{total_row-1})")
ws_grants.cell(total_row, 4).number_format = '$#,##0;($#,##0);-'
ws_grants.cell(total_row, 4).font = Font(bold=True)

# Total awarded formula
ws_grants.cell(total_row, 5, f"=SUM(E2:E{total_row-1})")
ws_grants.cell(total_row, 5).number_format = '$#,##0;($#,##0);-'
ws_grants.cell(total_row, 5).font = Font(bold=True)

#############
# METRICS TAB
#############
ws_metrics = wb.create_sheet("Metrics", 2)

ws_metrics['A1'] = "Grant Metrics Analysis"
ws_metrics['A1'].font = Font(size=14, bold=True, color="1E3A8A")

# Success rate
ws_metrics['A3'] = "Success Rate"
ws_metrics['A3'].font = Font(bold=True)
ws_metrics['B3'] = f"={${awardedProposals}}/{${submittedProposals} if ${submittedProposals} > 0 else 1}"
ws_metrics['B3'].number_format = '0.0%'

# Average request
ws_metrics['A4'] = "Average Request"
ws_metrics['A4'].font = Font(bold=True)
ws_metrics['B4'] = f"={${totalRequested}}/{${totalProposals} if ${totalProposals} > 0 else 1}"
ws_metrics['B4'].number_format = '$#,##0'

# Average award
ws_metrics['A5'] = "Average Award"
ws_metrics['A5'].font = Font(bold=True)
ws_metrics['B5'] = f"={${totalAwarded}}/{${awardedProposals} if ${awardedProposals} > 0 else 1}"
ws_metrics['B5'].number_format = '$#,##0'

ws_metrics.column_dimensions['A'].width = 20
ws_metrics.column_dimensions['B'].width = 15

# Save workbook
wb.save("${outputPath}")
print("Excel workbook generated successfully")
`;
  }

  /**
   * Generate Python script for budget template
   */
  private generateBudgetPythonScript(
    proposal: any,
    outputPath: string,
  ): string {
    const escape = (str: string | null | undefined) => {
      if (!str) return '';
      return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    };

    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime

wb = Workbook()
ws = wb.active
ws.title = "Budget"

# Title
ws['A1'] = "${escape(proposal.title)}"
ws['A1'].font = Font(size=16, bold=True, color="1E3A8A")
ws['A2'] = "Project Budget"
ws['A2'].font = Font(size=12, color="6B7280")

# Budget categories
row = 4
ws[f'A{row}'] = "Category"
ws[f'B{row}'] = "Description"
ws[f'C{row}'] = "Units"
ws[f'D{row}'] = "Rate ($)"
ws[f'E{row}'] = "Total ($)"

for col in ['A', 'B', 'C', 'D', 'E']:
    ws[f'{col}{row}'].font = Font(bold=True, color="FFFFFF")
    ws[f'{col}{row}'].fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")

# Sample budget lines (blue inputs, black formulas)
budget_items = [
    ("Personnel", "Project Director", 1, 75000),
    ("Personnel", "Program Coordinator", 1, 55000),
    ("Personnel", "Benefits (30%)", "", ""),
    ("Equipment", "Computers", 3, 1500),
    ("Supplies", "Office Supplies", 12, 200),
    ("Travel", "Conference Travel", 2, 1200),
    ("Other", "Consultants", 10, 150),
]

row = 5
for category, description, units, rate in budget_items:
    ws[f'A{row}'] = category
    ws[f'B{row}'] = description

    if units:
        ws[f'C{row}'] = units
        ws[f'C{row}'].font = Font(color="0000FF")  # Blue for inputs

    if rate:
        ws[f'D{row}'] = rate
        ws[f'D{row}'].number_format = '$#,##0'
        ws[f'D{row}'].font = Font(color="0000FF")  # Blue for inputs

    # Formula for total (black)
    if description == "Benefits (30%)":
        ws[f'E{row}'] = f"=(E5+E6)*0.3"
    elif units and rate:
        ws[f'E{row}'] = f"=C{row}*D{row}"

    ws[f'E{row}'].number_format = '$#,##0;($#,##0);-'

    row += 1

# Grand total
total_row = row + 1
ws[f'D{total_row}'] = "GRAND TOTAL"
ws[f'D{total_row}'].font = Font(bold=True)
ws[f'E{total_row}'] = f"=SUM(E5:E{row-1})"
ws[f'E{total_row}'].number_format = '$#,##0;($#,##0);-'
ws[f'E{total_row}'].font = Font(bold=True, size=12)
ws[f'E{total_row}'].fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

# Column widths
ws.column_dimensions['A'].width = 15
ws.column_dimensions['B'].width = 30
ws.column_dimensions['C'].width = 10
ws.column_dimensions['D'].width = 12
ws.column_dimensions['E'].width = 12

# Save
wb.save("${outputPath}")
print("Budget template generated successfully")
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
          reject(new Error(`Excel generation failed: ${stderr}`));
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
