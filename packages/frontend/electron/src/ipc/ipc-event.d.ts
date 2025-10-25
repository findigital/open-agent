import 'reflect-metadata';
export declare const IPC_EVENT_META_KEY: unique symbol;
export interface IpcEventOptions {
    scope: string;
    name?: string;
}
/**
 * Decorator for class properties that are event sources (e.g., RxJS Subjects)
 * to be broadcasted to renderer processes.
 */
export declare function IpcEvent(options: IpcEventOptions): PropertyDecorator;
//# sourceMappingURL=ipc-event.d.ts.map