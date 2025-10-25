import { type OnModuleInit } from '@nestjs/common';
export declare function registerSchemes(): void;
export declare class ProtocolService implements OnModuleInit {
    onModuleInit(): Promise<void>;
    private readonly handleFileRequest;
    setupInterceptors: () => void;
}
//# sourceMappingURL=protocol.service.d.ts.map