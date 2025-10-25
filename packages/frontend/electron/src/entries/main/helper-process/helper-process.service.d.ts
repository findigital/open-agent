import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import type { _AsyncVersionOf } from 'async-call-rpc';
import type { BaseWindow, WebContents } from 'electron';
import type { HelperToMain } from '../../../shared/type';
export declare class HelperProcessManager implements OnModuleInit, OnApplicationShutdown {
    private utilityProcess;
    private _ready;
    rpcToHelper?: _AsyncVersionOf<HelperToMain>;
    get ready(): Promise<void>;
    ensureHelperProcess(): Promise<any>;
    onModuleInit(): Promise<void>;
    onApplicationShutdown(signal?: string): void;
    connectRenderer(renderer: WebContents): () => void;
    connectMain(window: BaseWindow): void;
}
//# sourceMappingURL=helper-process.service.d.ts.map