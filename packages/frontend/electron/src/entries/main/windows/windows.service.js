var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { logger } from '../logger';
import { ensureAppReady } from '../utils';
import { MainWindowManager } from './main-window.service';
/**
 * This service is responsible for managing the windows of the application.
 * AKA the "launcher".
 */
let WindowsService = class WindowsService {
    constructor(mainWindowService) {
        this.mainWindowService = mainWindowService;
    }
    async onModuleInit() {
        await ensureAppReady();
        this.initializeMainWindow().catch(err => {
            logger.error('Failed to initialize main window', err);
        });
    }
    async initializeMainWindow() {
        return this.mainWindowService.initAndShowMainWindow();
    }
    async getMainWindow() {
        return this.mainWindowService.getMainWindow();
    }
};
WindowsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MainWindowManager])
], WindowsService);
export { WindowsService };
//# sourceMappingURL=windows.service.js.map