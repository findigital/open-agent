import { Project } from 'ts-morph';
import { type CollectedApisMap } from './types';
export declare const IpcHandleDecoratorName = "IpcHandle";
/**
 * Parses all IPC handlers in the project and collects their information
 */
export declare function parseIpcHandlers(project: Project): {
    apis: CollectedApisMap;
};
//# sourceMappingURL=handlers-parser.d.ts.map