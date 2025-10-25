import { BrowserWindow, nativeTheme } from 'electron';
import { HelperProcessManager } from '../helper-process';
export declare class MainWindowManager {
    private readonly helperProcessService;
    maximized$: any;
    fullScreen$: any;
    mainWindowReady: Promise<BrowserWindow> | undefined;
    mainWindow$: any;
    private hiddenMacWindow;
    constructor(helperProcessService: HelperProcessManager);
    get mainWindow(): any;
    private preventMacAppQuit;
    private cleanupWindows;
    private createMainWindow;
    private bindEvents;
    ensureMainWindow(): Promise<BrowserWindow>;
    initAndShowMainWindow(): Promise<BrowserWindow>;
    getMainWindow(): Promise<BrowserWindow>;
    show(): Promise<void>;
    handleThemeChange(theme: (typeof nativeTheme)['themeSource']): void;
    isFullScreen(): any;
    isMaximized(): any;
    handleMinimizeApp(): void;
    handleHideApp(): void;
    handleMaximizeApp(): void;
    transformToAppUrl(url: URL): string;
    /**
     * Open a URL in a hidden window.
     */
    openUrlInHiddenWindow(urlObj: URL): Promise<any>;
}
//# sourceMappingURL=main-window.service.d.ts.map