export declare class UtilsHandleService {
    /**
     * Safely execute an async function with comprehensive error handling
     * to prevent server crashes from external API failures
     */
    safeExecute<T>(operation: () => Promise<T>, operationName: string, fallback?: T): Promise<T>;
    /**
     * Safely execute an async function with timeout to prevent hanging
     */
    safeExecuteWithTimeout<T>(operation: () => Promise<T>, operationName: string, timeoutMs?: number, fallback?: T): Promise<T>;
    /**
     * Safely handle stream operations to prevent "Invalid state: Releasing reader" errors
     */
    safeStreamOperation<T>(streamOperation: () => Promise<T>, operationName: string, fallback?: T): Promise<T>;
    /**
     * Retry an operation with exponential backoff
     */
    retryOperation<T>(operation: () => Promise<T>, operationName: string, maxRetries?: number, baseDelay?: number): Promise<T>;
}
//# sourceMappingURL=utils-handle.service.d.ts.map