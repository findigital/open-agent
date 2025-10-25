import { app } from 'electron';
import { logger } from './logger';
const beforeAppQuitRegistry = [];
export function beforeAppQuit(fn) {
    beforeAppQuitRegistry.push(fn);
}
app.on('before-quit', () => {
    beforeAppQuitRegistry.forEach(fn => {
        // some cleanup functions might throw on quit and crash the app
        try {
            fn();
        }
        catch (err) {
            logger.warn('cleanup error on quit', err);
        }
    });
});
//# sourceMappingURL=cleanup.js.map