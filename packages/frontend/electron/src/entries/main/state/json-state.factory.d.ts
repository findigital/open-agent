import { Type } from 'arktype';
import { Observable } from 'rxjs';
export interface JsonStateServiceOptions<T> {
    beforeStateUpdate?: (state: T) => T;
    afterStateLoad?: (state: T) => T;
    beforeStateSave?: (state: T) => T;
    saveDebounceMs?: number;
}
export interface JsonStateService<T> {
    getState(): T;
    getState$(): Observable<T>;
    updateState(update: Partial<T>): Promise<void>;
    resetState(): Promise<void>;
    flush(): Promise<void>;
    destroy(): void;
}
export declare function createJsonStateService<T extends Record<string, any>>(filepath: string, defaultState: T, schema: Type<T>, options?: JsonStateServiceOptions<T>): JsonStateService<T>;
//# sourceMappingURL=json-state.factory.d.ts.map