import type { EventBasedChannel } from 'async-call-rpc';
interface MessagePortLike {
    postMessage: (data: unknown) => void;
    addListener: (event: 'message', listener: (...args: any[]) => void) => void;
    removeListener: (event: 'message', listener: (...args: any[]) => void) => void;
}
export declare class MessageEventChannel implements EventBasedChannel {
    private readonly worker;
    constructor(worker: MessagePortLike);
    on(listener: (data: unknown) => void): () => void;
    send(data: unknown): void;
}
export declare function shallowEqual<T>(objA: T, objB: T): boolean;
export {};
//# sourceMappingURL=utils.d.ts.map