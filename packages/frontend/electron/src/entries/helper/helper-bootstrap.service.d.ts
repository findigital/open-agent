import { type OnModuleInit } from '@nestjs/common';
import type { MessagePortMain } from 'electron';
import { IpcScanner } from '../../ipc';
/**
 * Service that handles the initial bootstrap of the helper process
 * and sets up the connection to the renderer process
 */
export declare class HelperBootstrapService implements OnModuleInit {
    private readonly ipcScanner;
    constructor(ipcScanner: IpcScanner);
    /**
     * Initialize the helper process, setting up message listeners for renderer connection
     */
    onModuleInit(): void;
    connectToRenderer(rendererPort: MessagePortMain): void;
}
//# sourceMappingURL=helper-bootstrap.service.d.ts.map