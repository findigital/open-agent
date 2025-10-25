import 'reflect-metadata';
export const IPC_EVENT_META_KEY = Symbol('ipc:event:source');
/**
 * Decorator for class properties that are event sources (e.g., RxJS Subjects)
 * to be broadcasted to renderer processes.
 */
export function IpcEvent(options) {
    return (target, propertyKey) => {
        if (typeof propertyKey === 'symbol') {
            console.warn(`[IpcEvent] Symbol property keys are not fully supported for IPC event names. Using symbol description or a fallback. Offending symbol: ${propertyKey.toString()}`);
            // Potentially use propertyKey.description if available and makes sense, or throw error
        }
        // Ensure options and scope are valid
        if (!options ||
            typeof options.scope !== 'string' ||
            options.scope.trim() === '') {
            throw new Error(`@IpcEvent on ${target.constructor.name}.${String(propertyKey)} requires a non-empty "scope" property in options.`);
        }
        if (options.name !== undefined &&
            (typeof options.name !== 'string' || options.name.trim() === '')) {
            throw new Error(`@IpcEvent on ${target.constructor.name}.${String(propertyKey)} "name" property, if provided, must be a non-empty string.`);
        }
        const eventNameForMeta = options.name ?? String(propertyKey).replace(/\$$/, '');
        const channelName = `${options.scope}:${eventNameForMeta}`;
        Reflect.defineMetadata(IPC_EVENT_META_KEY, {
            channel: channelName,
            originalName: String(propertyKey),
            scope: options.scope,
            declaredName: options.name,
        }, target, propertyKey);
    };
}
//# sourceMappingURL=ipc-event.js.map