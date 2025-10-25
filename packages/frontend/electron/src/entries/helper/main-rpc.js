var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Global, Injectable, Module } from '@nestjs/common';
import { AsyncCall } from 'async-call-rpc';
let MainRpcService = class MainRpcService {
    constructor() {
        this.rpc = null;
    }
    onModuleInit() {
        if (!process.parentPort) {
            console.error('[MainRpcService] parentPort is not available');
            return;
        }
        this.rpc = AsyncCall(null, {
            strict: {
                unknownMessage: false,
            },
            channel: {
                on(listener) {
                    const f = (e) => {
                        listener(e.data);
                    };
                    process.parentPort.on('message', f);
                    return () => {
                        process.parentPort.off('message', f);
                    };
                },
                send(data) {
                    process.parentPort.postMessage(data);
                },
            },
            log: false,
        });
    }
};
MainRpcService = __decorate([
    Injectable()
], MainRpcService);
export { MainRpcService };
let MainRpcModule = class MainRpcModule {
};
MainRpcModule = __decorate([
    Global(),
    Module({
        providers: [MainRpcService],
        exports: [MainRpcService],
    })
], MainRpcModule);
export { MainRpcModule };
//# sourceMappingURL=main-rpc.js.map