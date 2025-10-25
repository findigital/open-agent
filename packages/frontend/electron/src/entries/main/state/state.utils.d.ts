import type { AppState } from './state.types';
/**
 * Helper function to create type-safe state update objects
 */
export declare function createStateUpdate<K extends keyof AppState>(key: K, value: Partial<AppState[K]>): {
    [P in K]: Partial<AppState[P]>;
};
/**
 * Helper function to validate partial state updates
 */
export declare function validateStateUpdate(update: unknown): update is Partial<AppState>;
/**
 * Helper function to safely get nested state values
 */
export declare function getNestedValue<T>(obj: Record<string, any>, path: string, defaultValue?: T): T | undefined;
/**
 * Helper function to create a deep clone of state
 */
export declare function cloneState<T>(state: T): T;
//# sourceMappingURL=state.utils.d.ts.map