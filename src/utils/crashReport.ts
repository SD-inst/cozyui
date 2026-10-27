// A phone has no console. When React meets an uncaught error it unmounts the
// whole tree, so an iPhone user watches the controls appear and vanish and has
// nothing to show anyone. Everything in this file is plain data — no DOM, no
// React — so one description feeds the on-page overlay, the React boundary and
// the text the user copies and sends back.

export type crashKindType = 'render' | 'window' | 'chunk' | 'rejection';

export type crashInfoType = {
    kind: crashKindType;
    message: string;
    name?: string;
    stack?: string;
    // Where a window error was thrown, kept for the builds without source maps.
    location?: string;
    // The chunk that failed to load, for the 'chunk' kind.
    chunk?: string;
    // A rejected promise usually leaves a working page behind, so its report
    // can be dismissed; anything else means the UI is gone.
    dismissible?: boolean;
};

export type crashEnvironmentType = {
    version: string;
    userAgent: string;
    language: string;
    viewport: string;
    url: string;
    time: string;
};

const isErrorLike = (value: unknown): value is Error =>
    !!value &&
    typeof (value as Error).name === 'string' &&
    typeof (value as Error).message === 'string';

// Anything at all can be thrown or rejected with: an Error, a string, a DOM
// exception, a bare object, null. A report must never be the thing that fails.
const stringify = (value: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object' && value !== null) {
        try {
            const json = JSON.stringify(value);
            if (json && json !== '{}') {
                return json;
            }
        } catch {
            // Cyclic or exotic: the tag is all it has to say.
        }
        return Object.prototype.toString.call(value);
    }
    return String(value);
};

export type describedErrorType = {
    name?: string;
    message: string;
    stack?: string;
};

export const describeError = (error: unknown): describedErrorType => {
    if (isErrorLike(error)) {
        return {
            name: error.name,
            message: error.message || error.name,
            stack:
                typeof error.stack === 'string' ? error.stack : undefined,
        };
    }
    return { message: stringify(error) };
};

export const fromWindowError = (event: ErrorEvent): crashInfoType => {
    // A parse failure reaches the event as a bare message with no Error object
    // to describe, and that message is the only thing worth showing.
    const described: describedErrorType = event.error
        ? describeError(event.error)
        : { message: '' };
    return {
        kind: 'window',
        ...described,
        message: described.message || event.message || 'Unknown error',
        location: event.filename
            ? `${event.filename}:${event.lineno}:${event.colno}`
            : undefined,
    };
};

export const fromRejection = (event: PromiseRejectionEvent): crashInfoType => ({
    kind: 'rejection',
    dismissible: true,
    ...describeError(event.reason),
});

// Vite fires this when a lazy chunk — and this app is almost all lazy chunks —
// cannot be fetched or parsed. On iOS that is where an unsupported construct in
// one chunk shows up, so the chunk URL is the useful part of the message.
export const fromPreloadError = (error: unknown): crashInfoType => {
    const described = describeError(error);
    const url = /https?:\/\/\S+/.exec(described.message);
    return {
        kind: 'chunk',
        ...described,
        chunk: url ? url[0].replace(/[)'"]+$/, '') : undefined,
    };
};

export const collectEnvironment = (): crashEnvironmentType => ({
    version: import.meta.env.VITE_APP_VERSION || 'dev',
    userAgent: navigator.userAgent,
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}@${
        window.devicePixelRatio
    }x`,
    url: window.location.href,
    time: new Date().toISOString(),
});

// The whole point is a block of text that survives being pasted into a messager
// by someone who cannot open a console.
export const formatCrashReport = (
    reports: crashInfoType[],
    env: crashEnvironmentType,
): string => {
    const lines = [
        'CozyUI crash report',
        `version: ${env.version}`,
        `when: ${env.time}`,
        `browser: ${env.userAgent}`,
        `language: ${env.language}`,
        `viewport: ${env.viewport}`,
        `page: ${env.url}`,
        '',
    ];
    reports.forEach((report, index) => {
        lines.push(`--- problem ${index + 1} (${report.kind}) ---`);
        const who = report.name ? `${report.name}: ` : '';
        lines.push(`${who}${report.message}`);
        if (report.chunk) {
            lines.push(`chunk: ${report.chunk}`);
        }
        if (report.location) {
            lines.push(`at: ${report.location}`);
        }
        if (report.stack) {
            lines.push(report.stack);
        }
        lines.push('');
    });
    return lines.join('\n');
};

// One broken chunk usually surfaces twice: the Vite preload event and the
// rejection that follows it carry the same URL in their messages. Reporting
// both reads like two bugs and hides the one that matters.
export const isSameCrash = (a: crashInfoType, b: crashInfoType): boolean => {
    if (a.chunk && b.message.includes(a.chunk)) {
        return true;
    }
    if (b.chunk && a.message.includes(b.chunk)) {
        return true;
    }
    const first = a.message.trim();
    const second = b.message.trim();
    if (!first || !second) {
        return false;
    }
    return first === second || first.includes(second) || second.includes(first);
};
