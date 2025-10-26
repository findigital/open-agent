/**
 * Simple Zod to JSON Schema Converter
 * Handles basic Zod types used in grant tools
 */

import { z } from 'zod';

export function zodToJsonSchema(schema: z.ZodType<any, any, any>): Record<string, any> {
  return convertSchema(schema);
}

function convertSchema(schema: z.ZodType<any, any, any>): any {
  const zodType = schema._def.typeName;

  switch (zodType) {
    case 'ZodObject': {
      const shape = (schema as z.ZodObject<any>).shape;
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const fieldSchema = value as z.ZodType<any, any, any>;
        properties[key] = convertSchema(fieldSchema);

        // Check if field is optional
        if (fieldSchema._def.typeName !== 'ZodOptional' &&
            fieldSchema._def.typeName !== 'ZodDefault') {
          required.push(key);
        }
      }

      const result: any = {
        type: 'object',
        properties,
      };

      if (required.length > 0) {
        result.required = required;
      }

      return result;
    }

    case 'ZodString': {
      const def = schema._def as z.ZodStringDef;
      const result: any = { type: 'string' };

      if (def.description) {
        result.description = def.description;
      }

      // Handle enums
      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === 'min') {
            result.minLength = check.value;
          } else if (check.kind === 'max') {
            result.maxLength = check.value;
          }
        }
      }

      return result;
    }

    case 'ZodNumber': {
      const def = schema._def as z.ZodNumberDef;
      const result: any = { type: 'number' };

      if (def.description) {
        result.description = def.description;
      }

      if (def.checks) {
        for (const check of def.checks) {
          if (check.kind === 'min') {
            result.minimum = check.value;
          } else if (check.kind === 'max') {
            result.maximum = check.value;
          }
        }
      }

      return result;
    }

    case 'ZodBoolean': {
      const def = schema._def as z.ZodBooleanDef;
      const result: any = { type: 'boolean' };

      if (def.description) {
        result.description = def.description;
      }

      return result;
    }

    case 'ZodArray': {
      const def = schema._def as z.ZodArrayDef;
      const result: any = {
        type: 'array',
        items: convertSchema(def.type),
      };

      if (def.description) {
        result.description = def.description;
      }

      if (def.minLength) {
        result.minItems = def.minLength.value;
      }

      if (def.maxLength) {
        result.maxItems = def.maxLength.value;
      }

      return result;
    }

    case 'ZodEnum': {
      const def = schema._def as z.ZodEnumDef;
      const result: any = {
        type: 'string',
        enum: def.values,
      };

      if (def.description) {
        result.description = def.description;
      }

      return result;
    }

    case 'ZodOptional': {
      const def = schema._def as z.ZodOptionalDef;
      return convertSchema(def.innerType);
    }

    case 'ZodDefault': {
      const def = schema._def as z.ZodDefaultDef;
      const innerSchema = convertSchema(def.innerType);
      innerSchema.default = def.defaultValue();
      return innerSchema;
    }

    case 'ZodNullable': {
      const def = schema._def as z.ZodNullableDef;
      const innerSchema = convertSchema(def.innerType);
      innerSchema.nullable = true;
      return innerSchema;
    }

    case 'ZodUnion': {
      const def = schema._def as z.ZodUnionDef;
      return {
        anyOf: def.options.map((option: z.ZodType<any, any, any>) => convertSchema(option)),
      };
    }

    case 'ZodRecord': {
      const def = schema._def as z.ZodRecordDef;
      return {
        type: 'object',
        additionalProperties: convertSchema(def.valueType),
      };
    }

    case 'ZodLiteral': {
      const def = schema._def as z.ZodLiteralDef;
      return {
        type: typeof def.value,
        const: def.value,
      };
    }

    case 'ZodAny':
      return { type: 'object' };

    default:
      console.warn(`Unsupported Zod type: ${zodType}`);
      return { type: 'object' };
  }
}
