import type { ElectronApis } from './ipc-api-types.gen';
import type { ElectronEvents } from './ipc-event-types.gen';
declare global {
    var __appInfo: {
        electron: boolean;
        scheme: string;
        windowName: string;
    };
    var __apis: ClientHandler;
    var __events: ClientEvents;
}
export type ClientEvents = ElectronEvents;
export type ClientHandler = ElectronApis & {
    getPathForFile: (file: File) => Promise<string>;
};
export declare const apis: ClientHandler;
export declare const events: ClientEvents;
export * from './ipc-api-types.gen';
export * from './ipc-event-types.gen';
//# sourceMappingURL=index.d.ts.map