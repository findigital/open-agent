import { type DynamicModule } from '@nestjs/common';
/**
 * Get the current ipc event. Only works if being called within the main process.
 * The use case is to let the handler get access to the caller's webContents.
 */
export declare const getIpcEvent: () => any;
export declare class ElectronIpcModule {
    static forMain(): DynamicModule;
    static forHelper(): DynamicModule;
}
//# sourceMappingURL=ipc.module.d.ts.map