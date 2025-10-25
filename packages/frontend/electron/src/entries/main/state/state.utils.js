import { type } from 'arktype';
/**
 * Helper function to create type-safe state update objects
 */
export function createStateUpdate(key, value) {
    return { [key]: value };
}
/**
 * Helper function to validate partial state updates
 */
export function validateStateUpdate(update) {
    // Create a loose validation schema for partial updates
    const PartialStateSchema = type('Record<string, unknown>');
    const result = PartialStateSchema(update);
    return !(result instanceof type.errors);
}
/**
 * Helper function to safely get nested state values
 */
export function getNestedValue(obj, path, defaultValue) {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        }
        else {
            return defaultValue;
        }
    }
    return current;
}
/**
 * Helper function to create a deep clone of state
 */
export function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
}
//# sourceMappingURL=state.utils.js.map