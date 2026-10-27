// The on-page half of crash reporting: a panel made of plain DOM, written
// straight into the document. It deliberately uses no React, no MUI and no
// theme, because it is what is left when those are the things that broke — a
// failed module evaluation or a crash during the very first render never lets a
// React fallback mount at all.
//
// The panel exists for one reader: someone on a phone with no console, who has
// to be able to read the error and get its text to a developer.

import {
    collectEnvironment,
    crashInfoType,
    formatCrashReport,
    fromPreloadError,
    fromRejection,
    fromWindowError,
    isSameCrash,
} from './crashReport';

export type translateType = (
    key: string,
    options?: Record<string, string | number>,
) => string;

// Past three problems the panel is a wall of text and the first one — the
// cause — scrolls off the screen.
const MAX_REPORTS = 3;

let translate: translateType = (key) => key;
let reports: crashInfoType[] = [];
let panel: HTMLElement | null = null;
let installed = false;

const PANEL_CSS = [
    'position:fixed',
    'inset:0',
    'z-index:99999',
    'overflow:auto',
    'padding:18px',
    'background:#fffdf8',
    'color:#1b1b1f',
    'font:15px/1.45 system-ui,-apple-system,sans-serif',
    // iOS selects nothing by default, and an unselectable report is a report
    // nobody can send.
    '-webkit-user-select:text',
    'user-select:text',
].join(';');

const BUTTON_CSS = [
    'font:inherit',
    'padding:10px 16px',
    'margin:4px 10px 4px 0',
    'border:1px solid #b8b2a7',
    'border-radius:8px',
    'background:#ffffff',
    'color:#1b1b1f',
    '-webkit-appearance:none',
    'appearance:none',
].join(';');

const STACK_CSS = [
    'white-space:pre-wrap',
    'word-break:break-word',
    'font:12px/1.45 ui-monospace,SFMono-Regular,monospace',
    'background:#f2eee6',
    'padding:10px',
    'margin:8px 0',
    'border-radius:8px',
    'max-height:40vh',
    'overflow:auto',
].join(';');

const node = (
    tag: string,
    css: string,
    text?: string,
): HTMLElement => {
    const element = document.createElement(tag);
    element.style.cssText = css;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
};

// The clipboard API needs a secure context, and a dev server on the LAN is
// served over plain http — exactly the setup an iPhone tester is pointed at.
// Without it the text is handed to a selected textarea, which the user can
// long-press to copy.
const copyReport = (button: HTMLElement, hint: HTMLElement): void => {
    const text = formatCrashReport(reports, collectEnvironment());
    const manual = (): void => {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.cssText = [
            'position:fixed',
            'left:0',
            'right:0',
            'bottom:0',
            'height:40vh',
            'font:11px/1.4 monospace',
        ].join(';');
        panel?.appendChild(area);
        area.focus();
        area.setSelectionRange(0, area.value.length);
        hint.textContent = translate('errors.crash_copy_hint');
    };
    const write = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    if (!write) {
        manual();
        return;
    }
    write(text).then(
        () => {
            button.textContent = translate('errors.crash_copied');
        },
        manual,
    );
};

const render = (): void => {
    if (!reports.length) {
        panel?.remove();
        panel = null;
        return;
    }
    // Re-attach whenever the node is not in the document, so a report is never
    // written into a panel that something else has already taken out.
    if (!panel?.isConnected) {
        panel = node('div', PANEL_CSS);
        panel.id = 'crash-report';
        document.documentElement.appendChild(panel);
    }
    // Rebuilt from scratch on every report: the panel is a handful of nodes,
    // and this is also how a late-arriving locale replaces the text.
    panel.textContent = '';
    panel.appendChild(
        node(
            'div',
            'font-weight:600;font-size:18px;margin-bottom:6px',
            translate('errors.crash_title'),
        ),
    );
    const dismissible = reports.every((report) => report.dismissible);
    panel.appendChild(
        node(
            'div',
            'margin-bottom:12px',
            translate(
                dismissible
                    ? 'errors.crash_intro_dismissible'
                    : 'errors.crash_intro',
            ),
        ),
    );
    reports.forEach((report, index) => {
        const who = report.name ? `${report.name}: ` : '';
        panel?.appendChild(
            node(
                'div',
                'margin:8px 0;font-weight:600;word-break:break-word',
                translate('errors.crash_problem', {
                    n: index + 1,
                    message: `${who}${report.message}`,
                }),
            ),
        );
        const detail = [report.chunk, report.location, report.stack]
            .filter((line): line is string => !!line)
            .join('\n');
        if (detail) {
            panel?.appendChild(node('pre', STACK_CSS, detail));
        }
    });
    const button = node('button', BUTTON_CSS, translate('errors.crash_copy'));
    const hint = node('div', 'margin-top:8px;font-size:13px', '');
    button.addEventListener('click', () => copyReport(button, hint));
    panel.appendChild(button);
    if (dismissible) {
        const dismiss = node(
            'button',
            BUTTON_CSS,
            translate('errors.crash_dismiss'),
        );
        dismiss.addEventListener('click', dismissCrashReports);
        panel.appendChild(dismiss);
    }
    panel.appendChild(hint);
};

// A report must never be the thing that fails, so nothing here is allowed to
// throw out into the page it is describing.
export const reportCrash = (report: crashInfoType): void => {
    try {
        if (reports.some((seen) => isSameCrash(seen, report))) {
            return;
        }
        if (reports.length >= MAX_REPORTS) {
            return;
        }
        reports.push(report);
        render();
    } catch {
        // Nothing left to do: the panel is already showing what it could read.
    }
};

export const dismissCrashReports = (): void => {
    reports = [];
    panel?.remove();
    panel = null;
};

// Called when a locale file arrives after the panel was already drawn, so a
// crash in a non-English session does not stay in English.
export const refreshCrashOverlay = (): void => {
    if (reports.length) {
        render();
    }
};

// Anything the page hit before this module was even evaluated — a main chunk
// that failed to fetch or to parse — is queued by the inline guard in
// index.html, and drained here once there is something that can show it.
type earlyCrashType = {
    error?: unknown;
    message?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    reason?: unknown;
};

declare global {
    interface Window {
        __earlyCrashes?: earlyCrashType[] | null;
    }
}

const describeEarlyCrash = (entry: earlyCrashType): crashInfoType => {
    if (entry.error || entry.message) {
        return fromWindowError({
            error: entry.error,
            message: entry.message || '',
            filename: entry.filename,
            lineno: entry.lineno,
            colno: entry.colno,
        } as ErrorEvent);
    }
    return fromRejection({ reason: entry.reason } as PromiseRejectionEvent);
};

const drainEarlyCrashes = (): void => {
    const early = window.__earlyCrashes;
    if (!early) {
        return;
    }
    // Stops the inline guard from queueing anything else; from now on the
    // listeners below are the ones reporting.
    window.__earlyCrashes = null;
    for (const entry of early) {
        reportCrash(describeEarlyCrash(entry));
    }
};

export const installCrashReporting = (t?: translateType): void => {
    if (t) {
        translate = t;
    }
    if (installed) {
        drainEarlyCrashes();
        return;
    }
    installed = true;
    window.addEventListener('error', (event) => {
        // A failing <img> or <script> src reaches the same event, and it is
        // recognisable by what it does not carry: no message and no Error
        // object. Those leave a working page behind and would bury the report
        // that matters.
        if (!event.error && !event.message) {
            return;
        }
        reportCrash(fromWindowError(event));
    });
    window.addEventListener('unhandledrejection', (event) => {
        reportCrash(fromRejection(event));
    });
    window.addEventListener('vite:preloadError', (event) => {
        // Vite 6 puts the failure on `payload` and rethrows it, so the rejection
        // handler sees the same failure a moment later — `isSameCrash` keeps
        // that from being reported twice.
        const failure = (event as unknown as Record<string, unknown>)
            .payload as unknown;
        if (failure !== undefined) {
            reportCrash(fromPreloadError(failure));
        }
    });
    drainEarlyCrashes();
};

// Importing this module installs the listeners, so `main.tsx` can pull it in as
// its very first import: a module-evaluation error in anything imported after
// it would otherwise reach a page with no handler attached yet.
installCrashReporting();

