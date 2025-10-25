import { type CollectedApisMap, type CollectedEventsMap, type Entry } from './types';
export declare const determineEntry: (path: string) => Entry;
/**
 * Generates the API type definitions file content
 */
export declare function generateApiTypesFile(collectedApis: CollectedApisMap): string;
/**
 * Generates the event type definitions file content
 */
export declare function generateEventTypesFile(collectedEvents: CollectedEventsMap): string;
/**
 * Generates a combined metadata file for both IPC handlers and events
 */
export declare function generateCombinedMetaFile(apiHandlers: CollectedApisMap, events: CollectedEventsMap): string;
//# sourceMappingURL=utils.d.ts.map