import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../components/history/db';
import {
    deleteDatabase,
    deleteDatabaseWithin,
    requestDatabaseReset,
    runPendingDatabaseReset,
} from './resetDatabase';

// Deleting the database is the recovery path for a database that stopped
// answering, so the properties that matter are that it really removes the
// database, and that a blocked or silent deletion fails instead of hanging.
describe('resetDatabase', () => {
    beforeEach(async () => {
        sessionStorage.clear();
        await db.open();
        await db.settings.clear();
        await db.settings.put({ name: 'probe', value: 'x' });
    });
    afterEach(() => {
        vi.restoreAllMocks();
        sessionStorage.clear();
    });

    const openRaw = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(db.name);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

    it('removes the whole database, stores and all', async () => {
        expect(await db.settings.count()).toBe(1);
        await db.close();

        await deleteDatabase();

        const reopened = await openRaw();
        const storeCount = reopened.objectStoreNames.length;
        reopened.close();
        expect(storeCount).toBe(0);
    });

    it('fails instead of waiting forever when another tab blocks it', async () => {
        let request: Record<string, unknown> = {};
        vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
            request = {};
            return request as unknown as IDBOpenDBRequest;
        });

        const deleting = deleteDatabase();
        (request.onblocked as () => void)();

        await expect(deleting).rejects.toThrow(/blocked/);
    });

    it('fails when the request never answers at all', async () => {
        vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(
            () => ({}) as IDBOpenDBRequest,
        );

        await expect(deleteDatabaseWithin(20)).rejects.toThrow(/no answer/);
    });

    it('deletes once per pending request, and only when there is one', async () => {
        await db.close();
        const deleted = vi.spyOn(indexedDB, 'deleteDatabase');

        await runPendingDatabaseReset((key) => key);
        expect(deleted.mock.calls.length).toBe(0);

        requestDatabaseReset();
        await runPendingDatabaseReset((key) => key);
        expect(deleted.mock.calls.length).toBe(1);

        // The flag is consumed: the reload that follows a reset must not wipe
        // the freshly created database again.
        await runPendingDatabaseReset((key) => key);
        expect(deleted.mock.calls.length).toBe(1);
    });

    it('reports a reset that could not be carried out', async () => {
        let request: Record<string, unknown> = {};
        vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
            request = {};
            return request as unknown as IDBOpenDBRequest;
        });
        const reported: string[] = [];
        requestDatabaseReset();
        const running = runPendingDatabaseReset((key, options) => {
            reported.push(`${key}:${options?.err}`);
            return key;
        });
        (request.onerror as () => void)();
        await running;
        expect(reported[0]).toMatch(/^errors\.reset_database_failed:/);
    });
});
