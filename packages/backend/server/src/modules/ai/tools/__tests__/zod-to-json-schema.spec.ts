import test from 'ava';
import { z } from 'zod';

import { zodToJsonSchema } from '../zod-to-json-schema';

test('converts ZodString to JSON schema', t => {
  const schema = z.string().describe('A test string');
  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'string',
    description: 'A test string',
  });
});

test('converts ZodNumber to JSON schema', t => {
  const schema = z.number().describe('A test number');
  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'number',
    description: 'A test number',
  });
});

test('converts ZodBoolean to JSON schema', t => {
  const schema = z.boolean().describe('A test boolean');
  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'boolean',
    description: 'A test boolean',
  });
});

test('converts ZodObject with required fields', t => {
  const schema = z.object({
    name: z.string().describe('User name'),
    age: z.number().describe('User age'),
  });

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'User name',
      },
      age: {
        type: 'number',
        description: 'User age',
      },
    },
    required: ['name', 'age'],
  });
});

test('converts ZodObject with optional fields', t => {
  const schema = z.object({
    name: z.string(),
    email: z.string().optional(),
  });

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
    },
    required: ['name'], // email is optional, so not in required
  });
});

test('converts ZodArray', t => {
  const schema = z.array(z.string().describe('Item')).describe('List of items');

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'array',
    description: 'List of items',
    items: {
      type: 'string',
      description: 'Item',
    },
  });
});

test('converts ZodEnum', t => {
  const schema = z.enum(['red', 'green', 'blue']).describe('Color choices');

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'string',
    description: 'Color choices',
    enum: ['red', 'green', 'blue'],
  });
});

test('converts ZodDefault with default value', t => {
  const schema = z.number().default(10).describe('Count with default');

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'number',
    description: 'Count with default',
    default: 10,
  });
});

test('converts ZodOptional (unwraps)', t => {
  const schema = z.string().describe('Optional text').optional();

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'string',
    description: 'Optional text',
  });
});

test('converts nested ZodObject', t => {
  const schema = z.object({
    user: z.object({
      name: z.string(),
      age: z.number(),
    }),
    active: z.boolean(),
  });

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
      },
      active: { type: 'boolean' },
    },
    required: ['user', 'active'],
  });
});

test('converts ZodArray of objects', t => {
  const schema = z.array(
    z.object({
      id: z.string(),
      value: z.number(),
    })
  );

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        value: { type: 'number' },
      },
      required: ['id', 'value'],
    },
  });
});

test('converts ZodNullable', t => {
  const schema = z.string().nullable();

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'string',
    nullable: true,
  });
});

test('converts ZodUnion (anyOf)', t => {
  const schema = z.union([z.string(), z.number()]);

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    anyOf: [{ type: 'string' }, { type: 'number' }],
  });
});

test('converts ZodRecord', t => {
  const schema = z.record(z.number());

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'object',
    additionalProperties: { type: 'number' },
  });
});

test('converts complex grant tool schema', t => {
  // Real schema from grants-gov-search tool
  const schema = z.object({
    keywords: z
      .array(z.string())
      .describe('Keywords to search (e.g., ["education", "STEM", "K-12"])'),
    category: z
      .string()
      .optional()
      .describe('Grant category filter (e.g., "Education", "Health", "Environment")'),
    minAmount: z.number().optional().describe('Minimum grant amount in USD'),
    maxAmount: z.number().optional().describe('Maximum grant amount in USD'),
    limit: z.number().default(10).describe('Number of results to return (default 10)'),
  });

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'object',
    properties: {
      keywords: {
        type: 'array',
        description: 'Keywords to search (e.g., ["education", "STEM", "K-12"])',
        items: { type: 'string' },
      },
      category: {
        type: 'string',
        description:
          'Grant category filter (e.g., "Education", "Health", "Environment")',
      },
      minAmount: {
        type: 'number',
        description: 'Minimum grant amount in USD',
      },
      maxAmount: {
        type: 'number',
        description: 'Maximum grant amount in USD',
      },
      limit: {
        type: 'number',
        description: 'Number of results to return (default 10)',
        default: 10,
      },
    },
    required: ['keywords'],
  });
});

test('handles ZodLiteral', t => {
  const schema = z.literal('success');

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'string',
    const: 'success',
  });
});

test('handles ZodAny as object', t => {
  const schema = z.any();

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'object',
  });
});

test('converts string with min/max length constraints', t => {
  const schema = z.string().min(3).max(10);

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'string',
    minLength: 3,
    maxLength: 10,
  });
});

test('converts number with min/max constraints', t => {
  const schema = z.number().min(0).max(100);

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'number',
    minimum: 0,
    maximum: 100,
  });
});

test('converts array with min/max items', t => {
  const schema = z.array(z.string()).min(1).max(5);

  const result = zodToJsonSchema(schema);

  t.deepEqual(result, {
    type: 'array',
    items: { type: 'string' },
    minItems: 1,
    maxItems: 5,
  });
});
