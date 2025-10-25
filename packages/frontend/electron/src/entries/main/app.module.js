var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ElectronIpcModule } from '../../ipc';
import { HelperProcessModule } from './helper-process';
import { MiscModule } from './misc';
import { StateModule } from './state';
import { WindowsModule } from './windows';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ElectronIpcModule.forMain(),
            HelperProcessModule,
            WindowsModule,
            MiscModule,
            StateModule,
        ],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map