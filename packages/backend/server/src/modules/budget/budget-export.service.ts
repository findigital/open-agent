import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { BudgetLineItem } from './budget.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class BudgetExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export budget to CSV format
   */
  async exportToCSV(budgetId: string): Promise<string> {
    const budget = await this.getBudget(budgetId);
    const lineItems = budget.lineItems as unknown as BudgetLineItem[];

    // CSV header
    let csv = 'Category,Subcategory,Description,Quantity,Unit Cost,Total Cost,Justification\n';

    // Group by category for organized export
    const categories = this.groupByCategory(lineItems);

    for (const [category, items] of Object.entries(categories)) {
      for (const item of items) {
        csv += this.escapeCSV([
          item.category,
          item.subcategory || '',
          item.description,
          item.quantity.toString(),
          item.unitCost.toFixed(2),
          item.totalCost.toFixed(2),
          item.justification || '',
        ]);
        csv += '\n';
      }

      // Add category subtotal
      const categoryTotal = items.reduce((sum, item) => sum + item.totalCost, 0);
      csv += `,,${category} Subtotal,,,${categoryTotal.toFixed(2)},\n`;
    }

    // Add summary rows
    csv += '\n';
    csv += `,,Total Direct Costs,,,${Number(budget.totalDirectCosts).toFixed(2)},\n`;
    csv += `,,Indirect Costs (${(Number(budget.indirectRate) * 100).toFixed(1)}%),,,${Number(budget.indirectCosts).toFixed(2)},\n`;
    csv += `,,TOTAL PROJECT COSTS,,,${Number(budget.totalCosts).toFixed(2)},\n`;

    return csv;
  }

  /**
   * Export budget to Excel format with formatting
   */
  async exportToExcel(budgetId: string): Promise<Buffer> {
    const budget = await this.getBudget(budgetId);
    const lineItems = budget.lineItems as unknown as BudgetLineItem[];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Budget');

    // Set column widths
    worksheet.columns = [
      { key: 'category', width: 15 },
      { key: 'subcategory', width: 20 },
      { key: 'description', width: 40 },
      { key: 'quantity', width: 10 },
      { key: 'unit_cost', width: 12 },
      { key: 'total_cost', width: 12 },
      { key: 'justification', width: 50 },
    ];

    // Add title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'GRANT PROPOSAL BUDGET';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add headers
    const headerRow = worksheet.getRow(3);
    headerRow.values = [
      'Category',
      'Subcategory',
      'Description',
      'Quantity',
      'Unit Cost',
      'Total Cost',
      'Justification',
    ];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 20;

    let currentRow = 4;

    // Group by category
    const categories = this.groupByCategory(lineItems);
    const categoryOrder = ['Personnel', 'Travel', 'Equipment', 'Supplies', 'Contractual', 'Other', 'Indirect'];

    for (const category of categoryOrder) {
      const items = categories[category];
      if (!items || items.length === 0) continue;

      // Add category items
      for (const item of items) {
        const row = worksheet.getRow(currentRow);
        row.values = [
          item.category,
          item.subcategory || '',
          item.description,
          item.quantity,
          item.unitCost,
          item.totalCost,
          item.justification || '',
        ];

        // Format currency cells
        row.getCell(5).numFmt = '$#,##0.00';
        row.getCell(6).numFmt = '$#,##0.00';

        // Alternate row colors
        if (currentRow % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' },
          };
        }

        currentRow++;
      }

      // Add category subtotal
      const categoryTotal = items.reduce((sum, item) => sum + item.totalCost, 0);
      const subtotalRow = worksheet.getRow(currentRow);
      subtotalRow.values = ['', '', `${category} Subtotal`, '', '', categoryTotal, ''];
      subtotalRow.font = { bold: true };
      subtotalRow.getCell(6).numFmt = '$#,##0.00';
      subtotalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };

      currentRow++;
      currentRow++; // Blank row
    }

    // Add summary section
    currentRow++;
    const summaryStartRow = currentRow;

    // Total Direct Costs
    const directRow = worksheet.getRow(currentRow);
    directRow.values = ['', '', 'Total Direct Costs', '', '', Number(budget.totalDirectCosts), ''];
    directRow.font = { bold: true, size: 12 };
    directRow.getCell(6).numFmt = '$#,##0.00';
    directRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' },
    };
    currentRow++;

    // Indirect Costs
    const indirectRow = worksheet.getRow(currentRow);
    indirectRow.values = [
      '',
      '',
      `Indirect Costs (${(Number(budget.indirectRate) * 100).toFixed(1)}%)`,
      '',
      '',
      Number(budget.indirectCosts),
      '',
    ];
    indirectRow.font = { bold: true };
    indirectRow.getCell(6).numFmt = '$#,##0.00';
    currentRow++;

    // Total Project Costs
    const totalRow = worksheet.getRow(currentRow);
    totalRow.values = ['', '', 'TOTAL PROJECT COSTS', '', '', Number(budget.totalCosts), ''];
    totalRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(6).numFmt = '$#,##0.00';
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0070C0' },
    };

    // Add borders to all cells with data
    for (let i = 3; i <= currentRow; i++) {
      const row = worksheet.getRow(i);
      for (let j = 1; j <= 7; j++) {
        const cell = row.getCell(j);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // Add budget narrative sheet if available
    if (budget.narrative) {
      const narrativeSheet = workbook.addWorksheet('Budget Narrative');
      narrativeSheet.columns = [{ key: 'narrative', width: 100 }];

      // Add title
      const narrativeTitle = narrativeSheet.getCell('A1');
      narrativeTitle.value = 'BUDGET NARRATIVE';
      narrativeTitle.font = { size: 16, bold: true };
      narrativeTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };

      // Add narrative text
      const narrativeLines = budget.narrative.split('\n');
      let narrativeRow = 3;
      for (const line of narrativeLines) {
        const cell = narrativeSheet.getCell(`A${narrativeRow}`);
        cell.value = line;
        cell.alignment = { wrapText: true, vertical: 'top' };
        narrativeRow++;
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export budget narrative as text file
   */
  async exportNarrative(budgetId: string): Promise<string> {
    const budget = await this.getBudget(budgetId);

    if (!budget.narrative) {
      // Generate narrative if not exists
      const lineItems = budget.lineItems as unknown as BudgetLineItem[];
      return this.generateNarrative(lineItems, budget);
    }

    return budget.narrative;
  }

  /**
   * Get budget by ID with error handling
   */
  private async getBudget(budgetId: string) {
    const budget = await this.prisma.proposalBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }

  /**
   * Group line items by category
   */
  private groupByCategory(lineItems: BudgetLineItem[]): Record<string, BudgetLineItem[]> {
    return lineItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, BudgetLineItem[]>);
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(values: string[]): string {
    return values
      .map(value => {
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  }

  /**
   * Generate budget narrative from line items
   */
  private generateNarrative(lineItems: BudgetLineItem[], budget: any): string {
    const categories = this.groupByCategory(lineItems);

    let narrative = 'BUDGET NARRATIVE\n\n';

    for (const [category, items] of Object.entries(categories)) {
      narrative += `${category.toUpperCase()}\n`;

      const categoryTotal = items.reduce((sum, item) => sum + item.totalCost, 0);

      for (const item of items) {
        narrative += `\n${item.subcategory || item.description}\n`;
        narrative += `${item.quantity} × $${item.unitCost.toFixed(2)} = $${item.totalCost.toFixed(2)}\n`;

        if (item.justification) {
          narrative += `${item.justification}\n`;
        }
      }

      narrative += `\n${category} Subtotal: $${categoryTotal.toFixed(2)}\n\n`;
    }

    narrative += `\nTotal Direct Costs: $${Number(budget.totalDirectCosts).toFixed(2)}\n`;
    narrative += `Indirect Costs (${(Number(budget.indirectRate) * 100).toFixed(1)}%): $${Number(budget.indirectCosts).toFixed(2)}\n`;
    narrative += `\nTOTAL PROJECT COSTS: $${Number(budget.totalCosts).toFixed(2)}\n`;

    return narrative;
  }
}
