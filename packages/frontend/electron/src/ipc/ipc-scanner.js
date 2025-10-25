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
import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { isDev } from '../shared/constants';
import { IPC_EVENT_META_KEY } from './ipc-event';
import { IPC_HANDLE_META_KEY } from './ipc-handle';
import { logger } from '../entries/main/logger';
let IpcScanner = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var IpcScanner = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            IpcScanner = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        constructor(discover, scanner) {
            this.discover = discover;
            this.scanner = scanner;
        }
        scanHandlers() {
            const providers = this.discover.getProviders().filter(p => p.metatype);
            const handlers = new Map();
            for (const wrapper of providers) {
                const { instance } = wrapper;
                if (!instance ||
                    typeof instance !== 'object' ||
                    !Object.getPrototypeOf(instance))
                    continue;
                const proto = Object.getPrototypeOf(instance);
                const methodNames = this.scanner.getAllMethodNames(proto);
                const processCandidate = (method, _key) => {
                    const channel = Reflect.getMetadata(IPC_HANDLE_META_KEY, method);
                    if (!channel)
                        return;
                    if (isDev && handlers.has(channel)) {
                        logger.warn(`Duplicate IPC handle for ${channel}`);
                    }
                    handlers.set(channel, method.bind(instance));
                };
                // Process prototype methods
                for (const key of methodNames) {
                    const method = instance[key];
                    if (typeof method !== 'function')
                        continue;
                    processCandidate(method, key);
                }
                // Additionally process own enumerable properties (arrow functions, etc.)
                for (const key of Object.getOwnPropertyNames(instance)) {
                    if (methodNames.includes(key))
                        continue; // already processed
                    const candidate = instance[key];
                    if (typeof candidate !== 'function')
                        continue;
                    processCandidate(candidate, key);
                }
            }
            return handlers;
        }
        scanEventSources() {
            const providers = this.discover
                .getProviders()
                .filter(wrapper => wrapper.instance);
            const eventSources = new Map();
            for (const wrapper of providers) {
                const { instance } = wrapper;
                if (!instance || typeof instance !== 'object')
                    continue;
                for (const propertyKey of Object.getOwnPropertyNames(instance)) {
                    const eventSourceCandidate = instance[propertyKey];
                    if (!eventSourceCandidate ||
                        typeof eventSourceCandidate.subscribe !== 'function') {
                        continue;
                    }
                    const eventMeta = Reflect.getMetadata(IPC_EVENT_META_KEY, instance, propertyKey);
                    if (!eventMeta || !eventMeta.channel) {
                        continue;
                    }
                    if (isDev && eventSources.has(eventMeta.channel)) {
                        logger.warn(`Duplicate IPC event source for ${eventMeta.channel}`);
                    }
                    eventSources.set(eventMeta.channel, eventSourceCandidate);
                }
            }
            return eventSources;
        }
    };
    return IpcScanner = _classThis;
})();
export { IpcScanner };
//# sourceMappingURL=ipc-scanner.js.map