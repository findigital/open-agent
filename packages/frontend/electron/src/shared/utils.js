export class MessageEventChannel {
    constructor(worker) {
        this.worker = worker;
    }
    on(listener) {
        const f = (data) => {
            listener(data);
        };
        this.worker.addListener('message', f);
        return () => {
            this.worker.removeListener('message', f);
        };
    }
    send(data) {
        this.worker.postMessage(data);
    }
}
// credit: https://github.com/facebook/fbjs/blob/main/packages/fbjs/src/core/shallowEqual.js
export function shallowEqual(objA, objB) {
    if (Object.is(objA, objB)) {
        return true;
    }
    if (typeof objA !== 'object' ||
        objA === null ||
        typeof objB !== 'object' ||
        objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
        return false;
    }
    // Test for A's keys different from B.
    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(objB, key) ||
            !Object.is(objA[key], objB[key])) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=utils.js.map