var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
import { Injectable, OnModuleInit, OnApplicationShutdown, } from '@nestjs/common';
import { IpcHandle, IpcScope, IpcEvent } from '../../../ipc';
import { createJsonStateService } from './json-state.factory';
import { AppStateSchema, defaultAppState, } from './state.types';
let StateService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _state$_decorators;
    let _state$_initializers = [];
    let _state$_extraInitializers = [];
    let _handleGetState_decorators;
    let _handleUpdateState_decorators;
    let _handleResetState_decorators;
    let _handleFlushState_decorators;
    var StateService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _state$_decorators = [IpcEvent({ scope: IpcScope.APP_STATE })];
            _handleGetState_decorators = [IpcHandle({ scope: IpcScope.APP_STATE })];
            _handleUpdateState_decorators = [IpcHandle({ scope: IpcScope.APP_STATE })];
            _handleResetState_decorators = [IpcHandle({ scope: IpcScope.APP_STATE })];
            _handleFlushState_decorators = [IpcHandle({ scope: IpcScope.APP_STATE })];
            __esDecorate(this, null, _handleGetState_decorators, { kind: "method", name: "handleGetState", static: false, private: false, access: { has: obj => "handleGetState" in obj, get: obj => obj.handleGetState }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleUpdateState_decorators, { kind: "method", name: "handleUpdateState", static: false, private: false, access: { has: obj => "handleUpdateState" in obj, get: obj => obj.handleUpdateState }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleResetState_decorators, { kind: "method", name: "handleResetState", static: false, private: false, access: { has: obj => "handleResetState" in obj, get: obj => obj.handleResetState }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleFlushState_decorators, { kind: "method", name: "handleFlushState", static: false, private: false, access: { has: obj => "handleFlushState" in obj, get: obj => obj.handleFlushState }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, null, _state$_decorators, { kind: "field", name: "state$", static: false, private: false, access: { has: obj => "state$" in obj, get: obj => obj.state$, set: (obj, value) => { obj.state$ = value; } }, metadata: _metadata }, _state$_initializers, _state$_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            StateService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onModuleInit() {
            // Factory handles initialization
        }
        async onApplicationShutdown() {
            await this.stateService.flush();
            this.stateService.destroy();
        }
        // Delegate methods to the factory-created service
        getState() {
            return this.stateService.getState();
        }
        getState$() {
            return this.stateService.getState$();
        }
        async updateState(update) {
            return this.stateService.updateState(update);
        }
        async resetState() {
            return this.stateService.resetState();
        }
        async flush() {
            return this.stateService.flush();
        }
        // IPC handlers for renderer process
        handleGetState() {
            return this.getState();
        }
        handleUpdateState(update) {
            return this.updateState(update);
        }
        handleResetState() {
            return this.resetState();
        }
        handleFlushState() {
            return this.flush();
        }
        constructor() {
            this.stateService = (__runInitializers(this, _instanceExtraInitializers), createJsonStateService('app-state.json', defaultAppState, AppStateSchema));
            this.state$ = __runInitializers(this, _state$_initializers, this.getState$());
            __runInitializers(this, _state$_extraInitializers);
        }
    };
    return StateService = _classThis;
})();
export { StateService };
//# sourceMappingURL=state.service.js.map