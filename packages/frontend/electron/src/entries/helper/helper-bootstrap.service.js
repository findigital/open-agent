var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { AsyncCall } from 'async-call-rpc';
import { IpcScanner, RENDERER_CONNECT_CHANNEL_NAME } from '../../ipc';
/**
 * Service that handles the initial bootstrap of the helper process
 * and sets up the connection to the renderer process
 */
let HelperBootstrapService = class HelperBootstrapService {
    constructor(ipcScanner) {
        this.ipcScanner = ipcScanner;
    }
    /**
     * Initialize the helper process, setting up message listeners for renderer connection
     */
    onModuleInit() {
        console.log(`Helper bootstrap started`);
        // Check if we're in a worker environment with a parent port
        if (!process.parentPort) {
            console.error('Helper process was not started in a worker environment');
            return;
        }
        // Listen for 'renderer-connect' messages from the main process
        process.parentPort.on('message', e => {
            if (e.data.channel === RENDERER_CONNECT_CHANNEL_NAME &&
                e.ports.length === 1) {
                this.connectToRenderer(e.ports[0]);
                console.debug('Renderer connected');
            }
        });
        console.log('Helper bootstrap complete, waiting for renderer connection');
    }
    connectToRenderer(rendererPort) {
        const handlers = this.ipcScanner.scanHandlers();
        const flattenedHandlers = Array.from(handlers.entries()).map(([channel, handler]) => {
            const handlerWithLog = async (...args) => {
                try {
                    const start = performance.now();
                    const result = await handler(...args);
                    console.debug(`${channel}`, 'async-api', `${args.filter(arg => typeof arg !== 'function' && typeof arg !== 'object')} - ${(performance.now() - start).toFixed(2)} ms`);
                    return result;
                }
                catch (error) {
                    // Enhanced error handling to prevent crashes
                    console.error(`${channel}`, String(error), 'async-api');
                    // Return structured error instead of throwing
                    return {
                        error: true,
                        message: error instanceof Error
                            ? error.message
                            : 'Unknown handler error',
                        code: 'HELPER_HANDLER_ERROR',
                        channel,
                        timestamp: Date.now(),
                    };
                }
            };
            return [channel, handlerWithLog];
        });
        AsyncCall(Object.fromEntries(flattenedHandlers), {
            channel: {
                on(listener) {
                    const f = (e) => {
                        try {
                            listener(e.data);
                        }
                        catch (error) {
                            // Prevent crashes from message handling errors
                            console.error('Message handling error:', error);
                        }
                    };
                    rendererPort.on('message', f);
                    // MUST start the connection to receive messages
                    rendererPort.start();
                    return () => {
                        rendererPort.off('message', f);
                    };
                },
                send(data) {
                    try {
                        rendererPort.postMessage(data);
                    }
                    catch (error) {
                        // Prevent crashes from message sending errors
                        console.error('Message sending error:', error);
                    }
                },
            },
            log: false,
        });
    }
};
HelperBootstrapService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [IpcScanner])
], HelperBootstrapService);
export { HelperBootstrapService };
//# sourceMappingURL=helper-bootstrap.service.js.map