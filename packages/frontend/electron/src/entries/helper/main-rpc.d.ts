import { type OnModuleInit } from '@nestjs/common';
import { type AsyncVersionOf } from 'async-call-rpc';
import { MainToHelper } from '../../shared/type';
export declare class MainRpcService implements OnModuleInit {
    rpc: AsyncVersionOf<MainToHelper> | null;
    onModuleInit(): void;
}
export declare class MainRpcModule {
}
//# sourceMappingURL=main-rpc.d.ts.map