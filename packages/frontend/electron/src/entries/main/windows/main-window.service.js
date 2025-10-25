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
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { BrowserWindow, nativeTheme } from 'electron';
import electronWindowState from 'electron-window-state';
import { BehaviorSubject } from 'rxjs';
import { IpcEvent, IpcHandle, IpcScope } from '../../../ipc';
import { isDev } from '../../../shared/constants';
import { mainWindowOrigin } from '../constants';
import { HelperProcessManager } from '../helper-process';
import { logger } from '../logger';
import { isLinux, isMacOS } from '../utils';
function closeAllWindows() {
    BrowserWindow.getAllWindows().forEach(w => {
        if (!w.isDestroyed()) {
            w.destroy();
        }
    });
}
let MainWindowManager = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _maximized$_decorators;
    let _maximized$_initializers = [];
    let _maximized$_extraInitializers = [];
    let _fullScreen$_decorators;
    let _fullScreen$_initializers = [];
    let _fullScreen$_extraInitializers = [];
    let _show_decorators;
    let _handleThemeChange_decorators;
    let _isFullScreen_decorators;
    let _isMaximized_decorators;
    let _handleMinimizeApp_decorators;
    let _handleHideApp_decorators;
    let _handleMaximizeApp_decorators;
    var MainWindowManager = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _maximized$_decorators = [IpcEvent({ scope: IpcScope.UI })];
            _fullScreen$_decorators = [IpcEvent({ scope: IpcScope.UI })];
            _show_decorators = [IpcHandle({ scope: IpcScope.UI, name: 'showMainWindow' })];
            _handleThemeChange_decorators = [IpcHandle({ scope: IpcScope.UI })];
            _isFullScreen_decorators = [IpcHandle({ scope: IpcScope.UI })];
            _isMaximized_decorators = [IpcHandle({ scope: IpcScope.UI })];
            _handleMinimizeApp_decorators = [IpcHandle({ scope: IpcScope.UI })];
            _handleHideApp_decorators = [IpcHandle({ scope: IpcScope.UI })];
            _handleMaximizeApp_decorators = [IpcHandle({ scope: IpcScope.UI })];
            __esDecorate(this, null, _show_decorators, { kind: "method", name: "show", static: false, private: false, access: { has: obj => "show" in obj, get: obj => obj.show }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleThemeChange_decorators, { kind: "method", name: "handleThemeChange", static: false, private: false, access: { has: obj => "handleThemeChange" in obj, get: obj => obj.handleThemeChange }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _isFullScreen_decorators, { kind: "method", name: "isFullScreen", static: false, private: false, access: { has: obj => "isFullScreen" in obj, get: obj => obj.isFullScreen }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _isMaximized_decorators, { kind: "method", name: "isMaximized", static: false, private: false, access: { has: obj => "isMaximized" in obj, get: obj => obj.isMaximized }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleMinimizeApp_decorators, { kind: "method", name: "handleMinimizeApp", static: false, private: false, access: { has: obj => "handleMinimizeApp" in obj, get: obj => obj.handleMinimizeApp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleHideApp_decorators, { kind: "method", name: "handleHideApp", static: false, private: false, access: { has: obj => "handleHideApp" in obj, get: obj => obj.handleHideApp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleMaximizeApp_decorators, { kind: "method", name: "handleMaximizeApp", static: false, private: false, access: { has: obj => "handleMaximizeApp" in obj, get: obj => obj.handleMaximizeApp }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, null, _maximized$_decorators, { kind: "field", name: "maximized$", static: false, private: false, access: { has: obj => "maximized$" in obj, get: obj => obj.maximized$, set: (obj, value) => { obj.maximized$ = value; } }, metadata: _metadata }, _maximized$_initializers, _maximized$_extraInitializers);
            __esDecorate(null, null, _fullScreen$_decorators, { kind: "field", name: "fullScreen$", static: false, private: false, access: { has: obj => "fullScreen$" in obj, get: obj => obj.fullScreen$, set: (obj, value) => { obj.fullScreen$ = value; } }, metadata: _metadata }, _fullScreen$_initializers, _fullScreen$_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MainWindowManager = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        constructor(helperProcessService) {
            this.helperProcessService = (__runInitializers(this, _instanceExtraInitializers), helperProcessService);
            this.maximized$ = __runInitializers(this, _maximized$_initializers, new BehaviorSubject(false));
            this.fullScreen$ = (__runInitializers(this, _maximized$_extraInitializers), __runInitializers(this, _fullScreen$_initializers, new BehaviorSubject(false)));
            this.mainWindowReady = __runInitializers(this, _fullScreen$_extraInitializers);
            this.mainWindow$ = new BehaviorSubject(undefined);
        }
        get mainWindow() {
            return this.mainWindow$.value;
        }
        preventMacAppQuit() {
            if (!this.hiddenMacWindow && isMacOS()) {
                this.hiddenMacWindow = new BrowserWindow({
                    show: false,
                    width: 100,
                    height: 100,
                });
                this.hiddenMacWindow.on('close', () => {
                    this.cleanupWindows();
                });
            }
        }
        cleanupWindows() {
            closeAllWindows();
            this.mainWindowReady = undefined;
            this.mainWindow$.next(undefined);
            this.hiddenMacWindow?.destroy();
            this.hiddenMacWindow = undefined;
        }
        async createMainWindow() {
            logger.log('create window');
            const mainWindowState = electronWindowState({
                defaultWidth: 1000,
                defaultHeight: 800,
            });
            const browserWindow = new BrowserWindow({
                titleBarStyle: 'default',
                x: mainWindowState.x,
                y: mainWindowState.y,
                width: mainWindowState.width,
                autoHideMenuBar: isLinux(),
                minWidth: 640,
                minHeight: 480,
                visualEffectState: 'active',
                vibrancy: 'under-window',
                height: mainWindowState.height,
                show: false, // Use 'ready-to-show' event to show window
                webPreferences: {
                    webgl: true,
                    contextIsolation: true,
                    sandbox: false,
                    preload: join(__dirname, './preload.js'),
                    additionalArguments: [`--window-name=hidden-window`],
                },
            });
            nativeTheme.themeSource = 'dark';
            mainWindowState.manage(browserWindow);
            this.bindEvents(browserWindow);
            await this.helperProcessService.ready;
            this.helperProcessService.connectMain(browserWindow);
            await new Promise(resolve => setTimeout(resolve, 500));
            await browserWindow.loadURL(mainWindowOrigin + '/demo');
            return browserWindow;
        }
        bindEvents(mainWindow) {
            mainWindow.on('ready-to-show', () => {
                logger.log('main window is ready to show');
                this.maximized$.next(mainWindow.isMaximized());
                this.fullScreen$.next(mainWindow.isFullScreen());
            });
            mainWindow.webContents.on('did-finish-load', () => {
                this.helperProcessService.connectRenderer(mainWindow.webContents);
            });
            mainWindow.on('close', e => {
                e.preventDefault();
                if (!isMacOS()) {
                    closeAllWindows();
                    this.mainWindowReady = undefined;
                    this.mainWindow$.next(undefined);
                }
                else {
                    // hide window on macOS
                    if (mainWindow.isFullScreen()) {
                        mainWindow.once('leave-full-screen', () => {
                            mainWindow.hide();
                        });
                        mainWindow.setFullScreen(false);
                    }
                    else {
                        mainWindow.hide();
                    }
                }
            });
            const refreshBound = (timeout = 0) => {
                setTimeout(() => {
                    if (mainWindow.isDestroyed())
                        return;
                    const size = mainWindow.getSize();
                    mainWindow.setSize(size[0] + 1, size[1] + 1);
                    mainWindow.setSize(size[0], size[1]);
                }, timeout);
            };
            mainWindow.on('leave-full-screen', () => {
                refreshBound();
                refreshBound(1000);
                this.maximized$.next(false);
                this.fullScreen$.next(false);
            });
            mainWindow.on('maximize', () => {
                this.maximized$.next(true);
            });
            mainWindow.on('unmaximize', () => {
                this.maximized$.next(false);
            });
            // full-screen == maximized in UI on windows
            mainWindow.on('enter-full-screen', () => {
                this.fullScreen$.next(true);
            });
            mainWindow.on('leave-full-screen', () => {
                this.fullScreen$.next(false);
            });
        }
        async ensureMainWindow() {
            if (!this.mainWindowReady ||
                (await this.mainWindowReady.then(w => w.isDestroyed()))) {
                this.mainWindowReady = this.createMainWindow();
                this.mainWindow$.next(await this.mainWindowReady);
                this.preventMacAppQuit();
            }
            return this.mainWindowReady;
        }
        async initAndShowMainWindow() {
            const mainWindow = await this.ensureMainWindow();
            if (isDev) {
                // do not gain focus in dev mode
                mainWindow.showInactive();
            }
            else {
                mainWindow.show();
            }
            this.preventMacAppQuit();
            return mainWindow;
        }
        async getMainWindow() {
            return this.ensureMainWindow();
        }
        async show() {
            const window = await this.getMainWindow();
            if (!window)
                return;
            if (window.isMinimized()) {
                window.restore();
            }
            window.focus();
        }
        handleThemeChange(theme) {
            nativeTheme.themeSource = theme;
        }
        isFullScreen() {
            return this.mainWindow?.isFullScreen() ?? false;
        }
        isMaximized() {
            return this.mainWindow?.isMaximized() ?? false;
        }
        handleMinimizeApp() {
            this.mainWindow?.minimize();
        }
        handleHideApp() {
            this.mainWindow?.hide();
        }
        handleMaximizeApp() {
            const window = this.mainWindow;
            if (!window)
                return;
            // allow unmaximize when in full screen mode
            if (window.isFullScreen()) {
                window.setFullScreen(false);
                window.unmaximize();
            }
            else if (window.isMaximized()) {
                window.unmaximize();
            }
            else {
                window.maximize();
            }
        }
        transformToAppUrl(url) {
            const params = url.searchParams;
            return mainWindowOrigin + url.pathname + '?' + params.toString();
        }
        /**
         * Open a URL in a hidden window.
         */
        async openUrlInHiddenWindow(urlObj) {
            const url = this.transformToAppUrl(urlObj);
            const win = new BrowserWindow({
                width: 1200,
                height: 600,
                webPreferences: {
                    preload: join(__dirname, './preload.js'),
                    additionalArguments: [`--window-name=hidden-window`],
                },
                show: isDev,
            });
            if (isDev) {
                win.webContents.openDevTools();
            }
            logger.log('loading page at', url);
            win.loadURL(url).catch(e => {
                logger.error('failed to load url', e);
            });
            return win;
        }
    };
    return MainWindowManager = _classThis;
})();
export { MainWindowManager };
//# sourceMappingURL=main-window.service.js.map