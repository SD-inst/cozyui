import { db } from '../history/db';
import { genId } from '../../utils/id';

// Save a session (snapshot record + its media files + its chat, if any).
// Returns the new id.
export const saveSession = async (
    session: {
        name: string;
        tab: string;
        values: any;
        files: { filename: string; file: File }[];
        chat?: string; // serialized chat messages (db.chatLogs content)
    },
): Promise<string> => {
    const id = genId();
    await db.transaction('rw', db.sessions, db.sessionFiles, async () => {
        await db.sessions.put({
            id,
            name: session.name,
            tab: session.tab,
            values: JSON.stringify(session.values),
            chat: session.chat,
            timestamp: Date.now(),
        });
        if (session.files.length) {
            await db.sessionFiles.bulkPut(
                session.files.map((f) => ({
                    id: `${id}/${f.filename}`,
                    session: id,
                    filename: f.filename,
                    file: f.file,
                })),
            );
        }
    });
    return id;
};

export const deleteSession = async (id: string): Promise<void> => {
    await db.transaction('rw', db.sessions, db.sessionFiles, async () => {
        await db.sessions.delete(id);
        const all = await db.sessionFiles.where({ session: id }).toArray();
        if (all.length) {
            await db.sessionFiles.bulkDelete(all.map((f) => f.id));
        }
    });
};

// Default session name derived from the prompt field, trimmed to ~50 chars;
// falls back to a localized timestamp when there is no usable text (some tabs
// have no prompt field, e.g. video join).
//
// MiniMax H3 writes the generated prompt as structured sections led by a
// service header — `integrated_multimodal_description:` for T2V/I2V, or
// `detailed_description:` for R2V (where the body starts on the next line).
// Naming by the first line verbatim would give every H3 session the same
// header, so we strip the header and derive the name from the real
// description. Other models use a plain prompt, so we take its first
// non-empty line as-is.
export const defaultSessionName = (values: any, timestamp: number): string => {
    const prompt = values?.prompt;
    const text: string | undefined =
        typeof prompt === 'string'
            ? prompt
            : prompt && typeof prompt.text === 'string'
              ? prompt.text
              : undefined;
    if (text && text.trim()) {
        let body = text;
        const markers = [
            'integrated_multimodal_description:',
            'detailed_description:',
        ];
        for (const marker of markers) {
            const idx = body.indexOf(marker);
            if (idx !== -1) {
                body = body.slice(idx + marker.length);
                break;
            }
        }
        const line = body.split('\n').find((l) => l.trim()) ?? body;
        const trimmed = line.trim();
        if (trimmed) {
            return trimmed.length > 50
                ? trimmed.slice(0, 50) + '…'
                : trimmed;
        }
    }
    return new Date(timestamp).toLocaleString();
};
