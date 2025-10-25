import 'reflect-metadata';
import { IpcScope } from './constant';
export declare const IPC_HANDLE_META_KEY: unique symbol;
interface IpcHandleOptions {
    scope: IpcScope;
    name?: string;
}
export declare function IpcHandle(options: IpcHandleOptions): PropertyDecorator & MethodDecorator;
export {};
//# sourceMappingURL=ipc-handle.d.ts.map