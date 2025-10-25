import { AsyncCall } from 'async-call-rpc';
import { ipcRenderer } from 'electron';
import { Subject } from 'rxjs';
import { HELPER_CONNECT_CHANNEL_NAME } from '../../ipc/constant';
// Create a channel for MessagePort communication
const createMessagePortChannel = (port) => {
    return {
        on(listener) {
            const listen = (e) => {
                listener(e.data);
            };
            port.addEventListener('message', listen);
            port.start();
            return () => {
                port.removeEventListener('message', listen);
                try {
                    port.close();
                }
                catch (err) {
                    console.error('[helper] close port error', err);
                }
            };
        },
        send(data) {
            port.postMessage(data);
        },
    };
};
export const helperEvents$ = new Subject();
const rendererToHelperServer = {
    postEvent: (channel, ...args) => {
        helperEvents$.next({ channel, args });
    },
};
const helperPortPromise = Promise.withResolvers();
let connected = false;
// Setup for helper process APIs using MessagePort and AsyncCall RPC
ipcRenderer.on(HELPER_CONNECT_CHANNEL_NAME, event => {
    if (connected) {
        return;
    }
    console.info('[preload] helper-connection', event);
    connected = true;
    helperPortPromise.resolve(event.ports[0]);
});
// Helper process RPC setup
export const helperRpc = AsyncCall(rendererToHelperServer, {
    channel: helperPortPromise.promise.then(port => createMessagePortChannel(port)),
    log: false,
});
//# sourceMappingURL=helper-rpc.js.map