import { z } from 'zod';
import { Sandbox } from '@e2b/code-interpreter';

import { Config } from '../../../base';
import { CopilotStorage } from '../storage';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Generate project timeline and Gantt charts for grant proposals
 * Uses E2B Python sandbox to create professional visual timelines
 */
export const createTimelineGeneratorTool = (
  config: Config,
  copilotStorage: CopilotStorage
) => {
  return createTool(
    { toolName: 'timeline_generator' },
    {
      description: `Generate project timelines and Gantt charts for grant proposals.

Use this when you need to:
- Create visual project timeline
- Generate Gantt chart for work plan
- Show task dependencies and milestones
- Visualize project phases
- Create timeline for budget justification

Returns: URL to generated timeline image (PNG) and structured timeline data.`,
      inputSchema: z.object({
        projectTitle: z.string().describe('Project title'),
        projectDuration: z
          .number()
          .describe('Total project duration in months'),
        tasks: z
          .array(
            z.object({
              name: z.string().describe('Task name'),
              startMonth: z.number().describe('Start month (1-based)'),
              durationMonths: z.number().describe('Duration in months'),
              category: z
                .string()
                .optional()
                .describe('Category (e.g., "Planning", "Implementation", "Evaluation")'),
              milestone: z
                .boolean()
                .optional()
                .default(false)
                .describe('Is this a milestone?'),
            })
          )
          .describe('List of project tasks'),
        includeMonthLabels: z
          .boolean()
          .optional()
          .default(true)
          .describe('Include month labels on x-axis'),
        colorScheme: z
          .enum(['professional', 'vibrant', 'grayscale'])
          .optional()
          .default('professional')
          .describe('Color scheme for the chart'),
      }),
      execute: async (
        { projectTitle, projectDuration, tasks, includeMonthLabels, colorScheme },
        context
      ) => {
        try {
          const key = config.e2b.key;
          if (!key) {
            return toolError('E2B Not Configured', 'E2B API key is not configured');
          }

          const userId = context.userId || 'system';

          // Validate tasks
          for (const task of tasks) {
            if (task.startMonth < 1 || task.startMonth > projectDuration) {
              return toolError(
                'Invalid Task',
                `Task "${task.name}" has invalid start month: ${task.startMonth}`
              );
            }
            if (task.startMonth + task.durationMonths - 1 > projectDuration) {
              return toolError(
                'Invalid Task',
                `Task "${task.name}" extends beyond project duration`
              );
            }
          }

          // Define color schemes
          const colorSchemes = {
            professional: {
              planning: '#4472C4',
              implementation: '#70AD47',
              evaluation: '#FFC000',
              other: '#7F7F7F',
              milestone: '#C00000',
            },
            vibrant: {
              planning: '#FF6B6B',
              implementation: '#4ECDC4',
              evaluation: '#FFD93D',
              other: '#95E1D3',
              milestone: '#F38181',
            },
            grayscale: {
              planning: '#333333',
              implementation: '#666666',
              evaluation: '#999999',
              other: '#CCCCCC',
              milestone: '#000000',
            },
          };

          const colors = colorSchemes[colorScheme || 'professional'];

          // Build Python script for Gantt chart
          const pythonScript = `
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from datetime import datetime, timedelta
import json

# Task data
tasks = ${JSON.stringify(tasks)}
project_title = ${JSON.stringify(projectTitle)}
project_duration = ${projectDuration}
include_month_labels = ${includeMonthLabels}

# Color mapping
color_map = {
    'planning': '${colors.planning}',
    'implementation': '${colors.implementation}',
    'evaluation': '${colors.evaluation}',
    'other': '${colors.other}',
    'milestone': '${colors.milestone}',
}

# Create figure
fig, ax = plt.subplots(figsize=(14, max(8, len(tasks) * 0.4)))

# Sort tasks by start month
tasks_sorted = sorted(tasks, key=lambda x: x['startMonth'])

# Draw tasks
y_pos = 0
y_labels = []
milestones = []

for task in tasks_sorted:
    task_name = task['name']
    start = task['startMonth'] - 1  # Convert to 0-based
    duration = task['durationMonths']
    category = task.get('category', 'other').lower()
    is_milestone = task.get('milestone', False)

    # Get color based on category
    color = color_map.get(category, color_map['other'])

    if is_milestone:
        # Draw milestone as diamond
        ax.plot(start + duration/2, y_pos, marker='D', markersize=12,
                color=color_map['milestone'], zorder=10)
        milestones.append(task_name)
    else:
        # Draw task bar
        ax.barh(y_pos, duration, left=start, height=0.6,
                color=color, edgecolor='black', linewidth=0.5)

    y_labels.append(task_name)
    y_pos += 1

# Configure axes
ax.set_yticks(range(len(tasks_sorted)))
ax.set_yticklabels(y_labels, fontsize=9)
ax.set_xlabel('Project Timeline (Months)', fontsize=11, fontweight='bold')
ax.set_title(f'{project_title}\\nProject Timeline', fontsize=14, fontweight='bold', pad=20)

# X-axis configuration
ax.set_xlim(-0.5, project_duration + 0.5)
if include_month_labels:
    ax.set_xticks(range(project_duration))
    ax.set_xticklabels([f'M{i+1}' for i in range(project_duration)], fontsize=8)
else:
    ax.set_xticks(range(0, project_duration + 1, max(1, project_duration // 10)))

# Grid
ax.grid(axis='x', alpha=0.3, linestyle='--')
ax.set_axisbelow(True)

# Legend
legend_elements = []
categories_used = set(task.get('category', 'other').lower() for task in tasks)
for cat in sorted(categories_used):
    if cat in color_map:
        legend_elements.append(
            mpatches.Patch(color=color_map[cat], label=cat.capitalize())
        )
if milestones:
    legend_elements.append(
        plt.Line2D([0], [0], marker='D', color='w',
                   markerfacecolor=color_map['milestone'],
                   markersize=8, label='Milestone')
    )
ax.legend(handles=legend_elements, loc='upper right', fontsize=9)

# Adjust layout
plt.tight_layout()

# Save
plt.savefig('project_timeline.png', dpi=300, bbox_inches='tight', facecolor='white')
print('Timeline generated successfully')
`;

          // Execute Python code in E2B sandbox
          const logs: string[] = [];
          const errors: string[] = [];

          const onStdout = (msg: { line: string }) => {
            logs.push(msg.line);
          };

          const onStderr = (msg: { line: string }) => {
            errors.push(msg.line);
          };

          const sbx = await Sandbox.create({ apiKey: key });

          try {
            await sbx.runCode(pythonScript, { onStdout, onStderr });

            // Read the generated file
            const fileBytes = await sbx.filesystem.read('project_timeline.png', 'bytes');

            // Save to copilot storage
            const fileBuffer = Buffer.from(fileBytes as ArrayBuffer);
            const fileName = `timeline-${Date.now()}.png`;
            const fileUrl = await copilotStorage.put(userId, fileName, fileBuffer, true);

            // Calculate timeline statistics
            const stats = {
              totalTasks: tasks.length,
              milestones: tasks.filter(t => t.milestone).length,
              categories: tasks.reduce(
                (acc, task) => {
                  const cat = task.category || 'Other';
                  acc[cat] = (acc[cat] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
              projectSpan: {
                totalMonths: projectDuration,
                earliestStart: Math.min(...tasks.map(t => t.startMonth)),
                latestEnd: Math.max(...tasks.map(t => t.startMonth + t.durationMonths - 1)),
              },
            };

            // Generate text timeline
            const textTimeline = tasks
              .sort((a, b) => a.startMonth - b.startMonth)
              .map(task => {
                const end = task.startMonth + task.durationMonths - 1;
                const type = task.milestone ? '🔶 Milestone' : '📊 Task';
                return `${type}: ${task.name} (Month ${task.startMonth}-${end})`;
              })
              .join('\n');

            await sbx.kill();

            return {
              success: true,
              timelineUrl: fileUrl,
              projectTitle,
              projectDuration,
              statistics: stats,
              textTimeline,
              tasks: tasks.sort((a, b) => a.startMonth - b.startMonth),
              recommendations: [
                'Include this Gantt chart in the Work Plan or Project Timeline section',
                'Reference specific milestones in your narrative',
                'Ensure task durations align with budget periods',
                'Consider adding buffer time for unexpected delays',
                'Link timeline to evaluation plan checkpoints',
              ],
            };
          } finally {
            await sbx.kill();
          }
        } catch (e: any) {
          return toolError('Timeline Generation Failed', e.message);
        }
      },
    }
  );
};
