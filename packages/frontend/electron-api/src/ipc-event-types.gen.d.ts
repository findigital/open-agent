import type { Observable } from 'rxjs';
type ToSubscribe<T extends Observable<unknown>> = T extends Observable<infer P> ? (callback: (payload: P) => void) => () => void : never;
export interface ElectronEvents {
    appState: {
        onState: ToSubscribe<import('@afk/electron/entries/main/state/state.service').StateService['state$']>;
    };
    ui: {
        onMaximized: ToSubscribe<import('@afk/electron/entries/main/windows/main-window.service').MainWindowManager['maximized$']>;
        onFullScreen: ToSubscribe<import('@afk/electron/entries/main/windows/main-window.service').MainWindowManager['fullScreen$']>;
    };
}
export {};
//# sourceMappingURL=ipc-event-types.gen.d.ts.map