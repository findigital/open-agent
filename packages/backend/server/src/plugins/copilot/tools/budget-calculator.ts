import { z } from 'zod';

import { Config } from '../../../base';
import { CopilotStorage } from '../storage';
import { StreamObjectToolResult } from '../providers';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Calculate grant budget with personnel costs, fringe benefits, indirect costs
 * Generates professional Excel spreadsheet using E2B Python sandbox
 */
export const createBudgetCalculatorTool = (
  toolStream: WritableStream<StreamObjectToolResult>,
  config: Config,
  copilotStorage: CopilotStorage,
  userId: string
) => {
  return createTool(
    { toolName: 'budget_calculator' },
    {
      description: `Calculate detailed grant budget with personnel costs, fringe benefits, and indirect costs. Generates professional Excel spreadsheet.

Use this when you need to:
- Create line-item budgets
- Calculate personnel costs with fringe
- Apply indirect cost rates
- Generate professional Excel budget

Returns: Budget calculations and URL to Excel file.`,
      inputSchema: z.object({
        personnel: z
          .array(
            z.object({
              role: z.string().describe('Job title/role'),
              salary: z.number().describe('Annual salary in USD'),
              ftePercent: z.number().describe('FTE percentage (0-100)'),
              fringeRate: z.number().describe('Fringe benefit rate as percentage'),
            })
          )
          .describe('Array of personnel positions'),
        otherDirectCosts: z
          .array(
            z.object({
              category: z.string().describe('Budget category (e.g., "Travel", "Equipment")'),
              item: z.string().describe('Line item description'),
              amount: z.number().describe('Cost in USD'),
            })
          )
          .optional()
          .describe('Other direct costs'),
        indirectRate: z.number().describe('Indirect cost rate as percentage'),
      }),
      execute: async ({ personnel, otherDirectCosts, indirectRate }, { toolCallId }) => {
        try {
          const { key } = config.copilot.e2b;
          if (!key) {
            return toolError('Budget Calculator Failed', 'E2B API key not configured');
          }

          // Import E2B dynamically
          const { Sandbox } = await import('@e2b/code-interpreter');

          const writer = toolStream.getWriter();

          // Build Python script for budget calculation
          const pythonScript = `
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import json

# Personnel data
personnel_data = ${JSON.stringify(personnel)}

# Calculate personnel costs
personnel_rows = []
for person in personnel_data:
    base_cost = person['salary'] * (person['ftePercent'] / 100)
    fringe_cost = base_cost * (person['fringeRate'] / 100)
    total = base_cost + fringe_cost

    personnel_rows.append({
        'Role': person['role'],
        'Annual Salary': f"${person['salary']:,.0f}",
        'FTE %': f"{person['ftePercent']}%",
        'Base Cost': f"${base_cost:,.2f}",
        'Fringe Rate': f"{person['fringeRate']}%",
        'Fringe Cost': f"${fringe_cost:,.2f}",
        'Total': f"${total:,.2f}",
        '_base_cost': base_cost,
        '_fringe_cost': fringe_cost,
        '_total': total,
    })

# Other direct costs
other_costs = ${JSON.stringify(otherDirectCosts || [])}
other_rows = []
for cost in other_costs:
    other_rows.append({
        'Category': cost['category'],
        'Item': cost['item'],
        'Amount': f"${cost['amount']:,.2f}",
        '_amount': cost['amount'],
    })

# Calculate totals
total_personnel = sum(p['_total'] for p in personnel_rows)
total_other = sum(c['_amount'] for c in other_rows)
total_direct = total_personnel + total_other
indirect_cost = total_direct * (${indirectRate} / 100)
grand_total = total_direct + indirect_cost

# Create Excel workbook
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Grant Budget"

# Styling
header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
header_font = Font(color="FFFFFF", bold=True, size=11)
blue_fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")
total_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
total_font = Font(bold=True, size=11)
border = Border(
    left=Side(style='thin'),
    right=Side(style='thin'),
    top=Side(style='thin'),
    bottom=Side(style='thin')
)

# Title
ws['A1'] = 'GRANT BUDGET'
ws['A1'].font = Font(size=16, bold=True)
ws.merge_cells('A1:G1')
ws['A1'].alignment = Alignment(horizontal='center')

# Personnel Section
row = 3
ws[f'A{row}'] = 'PERSONNEL'
ws[f'A{row}'].font = Font(size=14, bold=True)

row += 1
headers = ['Role', 'Annual Salary', 'FTE %', 'Base Cost', 'Fringe Rate', 'Fringe Cost', 'Total']
for col, header in enumerate(headers, 1):
    cell = ws.cell(row, col)
    cell.value = header
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal='center')
    cell.border = border

# Personnel rows
for person in personnel_rows:
    row += 1
    ws[f'A{row}'] = person['Role']
    ws[f'B{row}'] = person['Annual Salary']
    ws[f'C{row}'] = person['FTE %']
    ws[f'D{row}'] = person['Base Cost']
    ws[f'E{row}'] = person['Fringe Rate']
    ws[f'F{row}'] = person['Fringe Cost']
    ws[f'G{row}'] = person['Total']

    # Apply blue fill
    for col in range(1, 8):
        ws.cell(row, col).fill = blue_fill
        ws.cell(row, col).border = border

# Personnel Total
row += 1
ws[f'A{row}'] = 'Total Personnel Costs'
ws[f'G{row}'] = f"${total_personnel:,.2f}"
ws[f'A{row}'].font = total_font
ws[f'G{row}'].font = total_font
ws[f'G{row}'].fill = total_fill
for col in range(1, 8):
    ws.cell(row, col).border = border

# Other Direct Costs Section
if other_rows:
    row += 2
    ws[f'A{row}'] = 'OTHER DIRECT COSTS'
    ws[f'A{row}'].font = Font(size=14, bold=True)

    row += 1
    ws[f'A{row}'] = 'Category'
    ws[f'B{row}'] = 'Item'
    ws[f'C{row}'] = 'Amount'
    for col in range(1, 4):
        cell = ws.cell(row, col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')
        cell.border = border

    for cost in other_rows:
        row += 1
        ws[f'A{row}'] = cost['Category']
        ws[f'B{row}'] = cost['Item']
        ws[f'C{row}'] = cost['Amount']
        for col in range(1, 4):
            ws.cell(row, col).fill = blue_fill
            ws.cell(row, col).border = border

    row += 1
    ws[f'A{row}'] = 'Total Other Direct Costs'
    ws[f'C{row}'] = f"${total_other:,.2f}"
    ws[f'A{row}'].font = total_font
    ws[f'C{row}'].font = total_font
    ws[f'C{row}'].fill = total_fill
    for col in range(1, 4):
        ws.cell(row, col).border = border

# Budget Summary
row += 2
ws[f'A{row}'] = 'BUDGET SUMMARY'
ws[f'A{row}'].font = Font(size=14, bold=True)

summary_items = [
    ('Total Personnel Costs', total_personnel),
    ('Total Other Direct Costs', total_other),
    ('Total Direct Costs', total_direct),
    (f'Indirect Costs ({${indirectRate}}%)', indirect_cost),
]

for label, value in summary_items:
    row += 1
    ws[f'A{row}'] = label
    ws[f'B{row}'] = f"${value:,.2f}"
    for col in range(1, 3):
        ws.cell(row, col).border = border

# Grand Total
row += 1
ws[f'A{row}'] = 'GRAND TOTAL'
ws[f'B{row}'] = f"${grand_total:,.2f}"
ws[f'A{row}'].font = Font(size=12, bold=True)
ws[f'B{row}'].font = Font(size=12, bold=True)
ws[f'A{row}'].fill = total_fill
ws[f'B{row}'].fill = total_fill
for col in range(1, 3):
    ws.cell(row, col).border = Border(
        left=Side(style='medium'),
        right=Side(style='medium'),
        top=Side(style='medium'),
        bottom=Side(style='medium')
    )

# Adjust column widths
ws.column_dimensions['A'].width = 25
ws.column_dimensions['B'].width = 15
ws.column_dimensions['C'].width = 12
ws.column_dimensions['D'].width = 15
ws.column_dimensions['E'].width = 12
ws.column_dimensions['F'].width = 15
ws.column_dimensions['G'].width = 15

# Save workbook
wb.save('grant_budget.xlsx')

# Return summary
result = {
    'totalPersonnel': total_personnel,
    'totalOther': total_other,
    'totalDirect': total_direct,
    'indirectCost': indirect_cost,
    'grandTotal': grand_total,
    'personnelCount': len(personnel_data),
    'otherCostsCount': len(other_costs),
}

print(json.dumps(result))
`;

          // Execute Python script in E2B sandbox
          const sbx = await Sandbox.create({ apiKey: key });

          let output = '';
          const execution = await sbx.runCode(pythonScript, {
            onStdout: async data => {
              output += data.line;
              await writer.write({
                type: 'tool-incomplete-result',
                toolCallId,
                data: {
                  type: 'text-delta',
                  textDelta: data.line,
                },
              });
            },
            onStderr: async data => {
              await writer.write({
                type: 'tool-incomplete-result',
                toolCallId,
                data: {
                  type: 'text-delta',
                  textDelta: `Error: ${data.line}`,
                },
              });
            },
          });

          if (execution.error) {
            await sbx.kill();
            writer.releaseLock();
            return toolError('Budget Calculator Failed', execution.error.value);
          }

          // Get the Excel file
          const files = await sbx.filesystem.list('/');
          const excelFile = files.find(f => f.name === 'grant_budget.xlsx');

          if (!excelFile) {
            await sbx.kill();
            writer.releaseLock();
            return toolError('Budget Calculator Failed', 'Excel file not generated');
          }

          // Read file and save to storage
          const fileBytes = await sbx.filesystem.read('/grant_budget.xlsx', 'bytes');
          const fileBuffer = Buffer.from(fileBytes);

          const fileUrl = await copilotStorage.put(
            userId,
            `budget-${Date.now()}.xlsx`,
            fileBuffer,
            true
          );

          await sbx.kill();
          writer.releaseLock();

          // Parse the calculation results
          const result = JSON.parse(output.trim());

          return {
            ...result,
            excelUrl: fileUrl,
            message: 'Budget calculated successfully. Excel file generated.',
          };
        } catch (e: any) {
          return toolError('Budget Calculator Failed', e.message);
        }
      },
    }
  );
};
