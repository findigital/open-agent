import { Project, PropertyDeclaration } from 'ts-morph';
import { type CollectedEventsMap, type ParsedEventInfo } from './types';
export declare const IpcEventDecoratorName = "IpcEvent";
/**
 * Parses the @IpcEvent decorator and extracts relevant information
 */
export declare function parseIpcEventDecorator(propertyDeclaration: PropertyDeclaration): Omit<ParsedEventInfo, 'description'> | {
    error: string;
};
/**
 * Parses all IPC events in the project and collects their information
 */
export declare function parseIpcEvents(project: Project): {
    events: CollectedEventsMap;
};
//# sourceMappingURL=events-parser.d.ts.map