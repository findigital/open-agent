import { OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { type AppState, type StateUpdate } from './state.types';
export declare class StateService implements OnModuleInit, OnApplicationShutdown {
    private stateService;
    state$: Observable<T>;
    onModuleInit(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
    getState(): AppState;
    getState$(): Observable<T>;
    updateState(update: StateUpdate): Promise<void>;
    resetState(): Promise<void>;
    flush(): Promise<void>;
    handleGetState(): AppState;
    handleUpdateState(update: StateUpdate): Promise<void>;
    handleResetState(): Promise<void>;
    handleFlushState(): Promise<void>;
}
//# sourceMappingURL=state.service.d.ts.map