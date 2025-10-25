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
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { AsyncCall } from 'async-call-rpc';
import { app, dialog, MessageChannelMain, shell, utilityProcess, } from 'electron';
import { HELPER_CONNECT_CHANNEL_NAME, RENDERER_CONNECT_CHANNEL_NAME, } from '../../../ipc';
import { MessageEventChannel } from '../../../shared/utils';
import { logger } from '../logger';
import { ensureAppReady } from '../utils';
const isDev = process.env.NODE_ENV === 'development';
const HELPER_PROCESS_PATH = path.join(__dirname, './helper.js');
function pickAndBind(obj, keys) {
    return keys.reduce((acc, key) => {
        const prop = obj[key];
        acc[key] = typeof prop === 'function' ? prop.bind(obj) : prop;
        return acc;
    }, {});
}
let HelperProcessManager = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var HelperProcessManager = class {
        static { _classThis = this; }
        constructor() {
            this.utilityProcess = null;
            this._ready = Promise.withResolvers();
        }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            HelperProcessManager = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        get ready() {
            return this._ready.promise;
        }
        async ensureHelperProcess() {
            await this.ready;
            // oxlint-disable-next-line no-non-null-assertion
            return this.utilityProcess;
        }
        async onModuleInit() {
            await ensureAppReady();
            logger.log('Initializing helper process...');
            const helperProcess = utilityProcess.fork(HELPER_PROCESS_PATH, [], {
                execArgv: isDev ? ['--inspect=40895'] : [], // Adjusted port
                serviceName: 'open-agent-helper-nestjs',
                stdio: 'pipe', // Capture stdio for logging
            });
            this.utilityProcess = helperProcess;
            if (isDev) {
                helperProcess.stdout?.on('data', data => {
                    logger.log(`(helper) >`, data.toString().trim());
                });
                helperProcess.stderr?.on('data', data => {
                    logger.error(data.toString().trim());
                });
            }
            helperProcess.once('spawn', () => {
                logger.log(`Helper process spawned successfully (PID: ${helperProcess.pid})`);
                // The RPC and other connections will be set up after spawn,
                // possibly triggered by other services or parts of the app.
                this._ready.resolve();
            });
            helperProcess.once('exit', code => {
                logger.warn(`Helper process exited with code: ${code}`);
                this.utilityProcess = null;
                // Re-reject the promise if it hasn't resolved yet, or handle re-initialization
                this._ready.reject(new Error(`Helper process exited with code: ${code}`));
                // Reset ready promise for potential restarts
                this._ready = Promise.withResolvers();
            });
            app.on('will-quit', () => this.onApplicationShutdown());
        }
        onApplicationShutdown(signal) {
            logger.log(`Shutting down helper process (signal: ${signal})...`);
            if (this.utilityProcess && this.utilityProcess.kill()) {
                logger.log('Helper process killed.');
            }
            else {
                logger.log('Helper process was not running or already killed.');
            }
            this.utilityProcess = null;
        }
        // Bridge renderer <-> helper process
        connectRenderer(renderer) {
            if (!this.utilityProcess) {
                logger.error('Helper process not started, cannot connect renderer.');
                throw new Error('Helper process not started.');
            }
            const { port1: helperPort, port2: rendererPort } = new MessageChannelMain();
            logger.log(`Connecting renderer (ID: ${renderer.id}) to helper process.`);
            this.utilityProcess.postMessage({ channel: RENDERER_CONNECT_CHANNEL_NAME }, [helperPort]);
            renderer.postMessage(HELPER_CONNECT_CHANNEL_NAME, null, [rendererPort]);
            return () => {
                try {
                    helperPort.close();
                    rendererPort.close();
                    logger.log(`Disconnected renderer (ID: ${renderer.id}) from helper process.`);
                }
                catch (err) {
                    logger.error('Error closing renderer connection ports:', err);
                }
            };
        }
        // Bridge main <-> helper process
        // also set up the RPC to the helper process
        connectMain(window) {
            if (!this.utilityProcess) {
                logger.error('Helper process not started, cannot connect main.');
                throw new Error('Helper process not started.');
            }
            const dialogMethods = {
                showOpenDialog: async (opts) => {
                    return dialog.showOpenDialog(window, opts);
                },
                showSaveDialog: async (opts) => {
                    return dialog.showSaveDialog(window, opts);
                },
            };
            const shellMethods = pickAndBind(shell, [
                'openExternal',
                'showItemInFolder',
            ]);
            const appMethods = pickAndBind(app, ['getPath']);
            // some electron api is not available in the helper process
            // so we need to proxy them to the helper process
            const mainToHelperServer = {
                ...dialogMethods,
                ...shellMethods,
                ...appMethods,
            };
            this.rpcToHelper = AsyncCall(mainToHelperServer, {
                strict: {
                    unknownMessage: false,
                },
                channel: new MessageEventChannel(this.utilityProcess),
                log: false,
            });
            logger.log('Main process connected to helper process for RPC.');
        }
    };
    return HelperProcessManager = _classThis;
})();
export { HelperProcessManager };
//# sourceMappingURL=helper-process.service.js.map