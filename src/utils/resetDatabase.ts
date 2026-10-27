// Deleting the whole local database is the only recovery for a database that
// has stopped answering (the WebKit `nextunique` wedge, a history that no
// longer loads). Two things make it more delicate than it looks: a deletion is
// blocked for as long as any tab holds a connection — and a blocked deletion
// never completes by itself — and the page that is offering the button is
// usually the tab holding that connection. So the deletion is attempted with a
// timeout, and if it does not complete, the flag below makes the next page load
// delete the database before anything has connected to it.
import { db } from '../components/history/db';
import { describeError } from './crashReport';
import { reportCrash, translateType } from './crashOverlay';

// sessionStorage, not the database: the database is what is being removed, and
// it is the thing that may be unusable.
const PENDING_KEY = 'cozyui:reset-database';

export const deleteDatabase = (): Promise<void> =>
    new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(db.name);
        request.onsuccess = () => resolve();
        request.onerror = () =>
            reject(request.error ?? new Error('deleteDatabase rejected'));
        request.onblocked = () =>
            reject(new Error('blocked by another open tab'));
    });

export const deleteDatabaseWithin = (ms: number): Promise<void> =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`no answer within ${ms}ms`)),
            ms,
        );
        deleteDatabase().then(
            () => {
                clearTimeout(timer);
                resolve();
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });

export const requestDatabaseReset = (): void => {
    try {
        sessionStorage.setItem(PENDING_KEY, '1');
    } catch {
        // A private mode that refuses storage leaves the direct deletion as the
        // only route; the dialog still reports what happened.
    }
};

const takePendingReset = (): boolean => {
    try {
        const pending = sessionStorage.getItem(PENDING_KEY) === '1';
        sessionStorage.removeItem(PENDING_KEY);
        return pending;
    } catch {
        return false;
    }
};

// Called from `main.tsx` before the app renders: the deletion has its best
// chance at a moment when nothing has opened a connection yet. Dexie recreates
// an empty database at the current schema as soon as the app needs it, so the
// page carries on loading normally afterwards.
export const runPendingDatabaseReset = async (
    tr: translateType,
): Promise<void> => {
    if (!takePendingReset()) {
        return;
    }
    try {
        // Timed as well: a deletion blocked by another tab would otherwise hold
        // the whole page from rendering.
        await deleteDatabaseWithin(5000);
    } catch (e) {
        reportCrash({
            kind: 'rejection',
            dismissible: true,
            message: tr('errors.reset_database_failed', {
                err: describeError(e).message,
            }),
        });
    }
};
