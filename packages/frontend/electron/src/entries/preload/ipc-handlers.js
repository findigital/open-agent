import { ipcRenderer } from 'electron';
import { IPC_API_CHANNEL_NAME } from '../../ipc/constant';
import { helperRpc } from './helper-rpc';
import { handlersMeta } from './ipc-meta.gen';
import { webUtils } from 'electron/renderer';
// Handler for main process APIs using ipcRenderer.invoke
const createMainApiHandler = (channel) => {
    return (...args) => {
        return ipcRenderer.invoke(IPC_API_CHANNEL_NAME, channel, ...args);
    };
};
// Create helper API handler
const createHelperApiHandler = (channel) => {
    return async (...args) => {
        return (helperRpc[channel]?.(...args) ??
            Promise.reject(new Error(`Method ${channel} not found`)));
    };
};
// --- Construct the API object to be exposed ---
// Process main handlers
const mainApis = Object.fromEntries(Object.entries(handlersMeta.main).map(([scope, methodNames]) => [
    scope,
    Object.fromEntries(methodNames.map(methodName => [
        methodName,
        createMainApiHandler(`${scope}:${methodName}`),
    ])),
]));
// Process helper handlers
const helperApis = Object.fromEntries(Object.entries(handlersMeta.helper).map(([scope, methodNames]) => [
    scope,
    Object.fromEntries(methodNames.map(methodName => [
        methodName,
        createHelperApiHandler(`${scope}:${methodName}`),
    ])),
]));
// Combine all APIs
export const exposedApis = {
    ...mainApis,
    ...helperApis,
    getPathForFile: (file) => {
        return webUtils.getPathForFile(file);
    },
};
//# sourceMappingURL=ipc-handlers.js.map