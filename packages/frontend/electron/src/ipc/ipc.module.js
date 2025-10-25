var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { app, BrowserWindow, ipcMain, WebContentsView, } from 'electron';
import { IPC_API_CHANNEL_NAME, IPC_EVENT_CHANNEL_NAME } from './constant';
import { IpcScanner } from './ipc-scanner';
import { logger } from '../entries/main/logger';
/**
 * Injecting IpcMainInvokeEvent to the handler function
 * e.g.,
 *
 * ```
 * @IpcHandle({ scope: IpcScope.UI })
 * async foo() {
 *   const event = getIpcEvent();
 *   const webContents = event.sender;
 * }
 * ```
 */
const ipcEventStore = new AsyncLocalStorage();
/**
 * Get the current ipc event. Only works if being called within the main process.
 * The use case is to let the handler get access to the caller's webContents.
 */
export const getIpcEvent = () => {
    const event = ipcEventStore.getStore();
    if (!event) {
        throw new Error('No ipc event found');
    }
    return event;
};
let IpcMainInitializerService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var IpcMainInitializerService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            IpcMainInitializerService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        constructor(ipcScanner) {
            this.ipcScanner = ipcScanner;
            this.context = 'IpcMainInitializerService';
        }
        onModuleInit() {
            this.registerHandlers();
            this.registerEventEmitters();
        }
        registerHandlers() {
            const handlers = this.ipcScanner.scanHandlers();
            const handleIpcMessage = async (...args) => {
                logger.debug('ipcMain.handle', args[0], this.context);
                // args[0] is the `{namespace:key}`
                if (typeof args[0] !== 'string') {
                    logger.error('invalid ipc message', args, this.context);
                    return;
                }
                const handler = handlers.get(args[0]);
                if (!handler) {
                    logger.error('handler not found for ', args[0], this.context);
                    return;
                }
                const realArgs = args.slice(1);
                // Enhanced error handling to prevent server crashes
                try {
                    // put the event LAST for ease of use
                    const result = await handler(...realArgs);
                    return result;
                }
                catch (error) {
                    // Log the error but don't crash the server
                    logger.error(`IPC handler error for ${args[0]}:`, error, this.context);
                    // Return a structured error response instead of throwing
                    return {
                        error: true,
                        message: error instanceof Error ? error.message : 'Unknown error occurred',
                        code: 'IPC_HANDLER_ERROR',
                        timestamp: Date.now(),
                    };
                }
            };
            logger.debug(`Found ${handlers.size} IPC handlers`, this.context);
            ipcMain.handle(IPC_API_CHANNEL_NAME, (e, ...args) => {
                return new Promise((resolve, reject) => {
                    ipcEventStore.run(e, () => {
                        handleIpcMessage(...args)
                            .then(resolve)
                            .catch(error => {
                            // Enhanced error handling for IPC calls
                            logger.error(`IPC call failed for ${args[0]}:`, error, this.context);
                            // Return structured error instead of rejecting
                            resolve({
                                error: true,
                                message: error instanceof Error
                                    ? error.message
                                    : 'Unknown IPC error',
                                code: 'IPC_CALL_ERROR',
                                timestamp: Date.now(),
                            });
                        });
                    });
                });
            });
            // for handling ipcRenderer.sendSync
            ipcMain.on(IPC_API_CHANNEL_NAME, (e, ...args) => {
                ipcEventStore.run(e, () => {
                    handleIpcMessage(...args)
                        .then(ret => {
                        e.returnValue = ret;
                    })
                        .catch(error => {
                        // Enhanced error handling for sync calls
                        logger.error(`IPC sync call failed for ${args[0]}:`, error, this.context);
                        // Return structured error instead of crashing
                        e.returnValue = {
                            error: true,
                            message: error instanceof Error
                                ? error.message
                                : 'Unknown IPC sync error',
                            code: 'IPC_SYNC_ERROR',
                            timestamp: Date.now(),
                        };
                    });
                });
            });
        }
        broadcastToAllWindows(channel, ...args) {
            // logger.debug('broadcast event', channel, this.context);
            BrowserWindow.getAllWindows().forEach(win => {
                if (win.isDestroyed())
                    return;
                try {
                    win.webContents?.send(IPC_EVENT_CHANNEL_NAME, channel, ...args);
                    if (win.contentView && win.contentView.children) {
                        win.contentView.children.forEach(child => {
                            if (child instanceof WebContentsView &&
                                child.webContents &&
                                !child.webContents.isDestroyed()) {
                                child.webContents.send(IPC_EVENT_CHANNEL_NAME, channel, ...args);
                            }
                        });
                    }
                }
                catch (error) {
                    logger.error('failed to broadcast event', channel, error, this.context);
                }
            });
        }
        registerEventEmitters() {
            const eventSources = this.ipcScanner.scanEventSources();
            const unsubscribers = [];
            logger.debug(`Found ${eventSources.size} IPC event sources`, this.context);
            for (const [channel, eventSource$] of eventSources.entries()) {
                const unsubscribe = eventSource$.subscribe({
                    next: (payload) => {
                        this.broadcastToAllWindows(channel, payload);
                    },
                });
                unsubscribers.push(() => unsubscribe.unsubscribe());
            }
            app.on('before-quit', () => {
                unsubscribers.forEach(unsubscribe => unsubscribe());
            });
        }
    };
    return IpcMainInitializerService = _classThis;
})();
export class ElectronIpcModule {
    static forMain() {
        return {
            module: ElectronIpcModule,
            imports: [DiscoveryModule],
            providers: [IpcScanner, IpcMainInitializerService],
            exports: [IpcScanner],
        };
    }
    static forHelper() {
        return {
            module: ElectronIpcModule,
            imports: [DiscoveryModule],
            providers: [IpcScanner],
            exports: [IpcScanner],
        };
    }
}
//# sourceMappingURL=ipc.module.js.map