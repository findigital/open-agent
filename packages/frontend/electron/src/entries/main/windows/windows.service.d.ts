import { type OnModuleInit } from '@nestjs/common';
import { MainWindowManager } from './main-window.service';
/**
 * This service is responsible for managing the windows of the application.
 * AKA the "launcher".
 */
export declare class WindowsService implements OnModuleInit {
    private readonly mainWindowService;
    constructor(mainWindowService: MainWindowManager);
    onModuleInit(): Promise<void>;
    initializeMainWindow(): Promise<BrowserWindow>;
    getMainWindow(): Promise<BrowserWindow>;
}
//# sourceMappingURL=windows.service.d.ts.map