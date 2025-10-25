export var IpcScope;
(function (IpcScope) {
    IpcScope["UI"] = "ui";
    IpcScope["APP_STATE"] = "appState";
    IpcScope["PROJECT"] = "project";
    IpcScope["MEDIA_ASSET"] = "mediaAsset";
    IpcScope["MEDIA_ANALYZER"] = "mediaAnalyzer";
    IpcScope["MENU"] = "menu";
    IpcScope["HELPER"] = "helper";
    IpcScope["EDIT_PIPELINE"] = "editPipeline";
})(IpcScope || (IpcScope = {}));
export const IPC_API_CHANNEL_NAME = 'ipc-api';
export const IPC_EVENT_CHANNEL_NAME = 'ipc-event';
export const RENDERER_CONNECT_CHANNEL_NAME = 'renderer-connect';
export const HELPER_CONNECT_CHANNEL_NAME = 'helper-connect';
export const WORKER_CONNECT_CHANNEL_NAME = 'worker-connect';
//# sourceMappingURL=constant.js.map