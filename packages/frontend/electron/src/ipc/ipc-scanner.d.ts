import { DiscoveryService, MetadataScanner } from '@nestjs/core';
export declare class IpcScanner {
    private readonly discover;
    private readonly scanner;
    constructor(discover: DiscoveryService, scanner: MetadataScanner);
    scanHandlers(): Map<string, (...args: any[]) => any>;
    scanEventSources(): Map<string, Observable<any>>;
}
//# sourceMappingURL=ipc-scanner.d.ts.map