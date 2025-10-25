var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { logger } from '../logger';
let UtilsHandleService = class UtilsHandleService {
    /**
     * Safely execute an async function with comprehensive error handling
     * to prevent server crashes from external API failures
     */
    async safeExecute(operation, operationName, fallback) {
        try {
            return await operation();
        }
        catch (error) {
            logger.error(`Safe execute failed for ${operationName}:`, error);
            if (fallback !== undefined) {
                logger.warn(`Using fallback value for ${operationName}`);
                return fallback;
            }
            // Return a structured error response
            return {
                error: true,
                message: error instanceof Error ? error.message : 'Unknown error',
                code: 'SAFE_EXECUTE_ERROR',
                operation: operationName,
                timestamp: Date.now(),
            };
        }
    }
    /**
     * Safely execute an async function with timeout to prevent hanging
     */
    async safeExecuteWithTimeout(operation, operationName, timeoutMs = 30000, fallback) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            const result = await Promise.race([operation(), timeoutPromise]);
            return result;
        }
        catch (error) {
            logger.error(`Safe execute with timeout failed for ${operationName}:`, error);
            if (fallback !== undefined) {
                logger.warn(`Using fallback value for ${operationName} after timeout`);
                return fallback;
            }
            return {
                error: true,
                message: error instanceof Error ? error.message : 'Operation timed out',
                code: 'SAFE_EXECUTE_TIMEOUT',
                operation: operationName,
                timeoutMs,
                timestamp: Date.now(),
            };
        }
    }
    /**
     * Safely handle stream operations to prevent "Invalid state: Releasing reader" errors
     */
    async safeStreamOperation(streamOperation, operationName, fallback) {
        try {
            return await streamOperation();
        }
        catch (error) {
            // Handle specific stream-related errors
            if (error instanceof Error && error.message.includes('Invalid state')) {
                logger.warn(`Stream state error for ${operationName}:`, error.message);
            }
            else {
                logger.error(`Stream operation failed for ${operationName}:`, error);
            }
            if (fallback !== undefined) {
                logger.warn(`Using fallback value for ${operationName} after stream error`);
                return fallback;
            }
            return {
                error: true,
                message: error instanceof Error ? error.message : 'Stream operation failed',
                code: 'SAFE_STREAM_ERROR',
                operation: operationName,
                timestamp: Date.now(),
            };
        }
    }
    /**
     * Retry an operation with exponential backoff
     */
    async retryOperation(operation, operationName, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt === maxRetries) {
                    logger.error(`Operation ${operationName} failed after ${maxRetries} retries:`, lastError);
                    throw lastError;
                }
                const delay = baseDelay * Math.pow(2, attempt);
                logger.warn(`Operation ${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
};
UtilsHandleService = __decorate([
    Injectable()
], UtilsHandleService);
export { UtilsHandleService };
//# sourceMappingURL=utils-handle.service.js.map