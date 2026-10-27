// First import on purpose: this module installs its error listeners as it is
// evaluated, and ES modules are evaluated in source order, so a module that
// throws while being loaded — or a chunk that never arrives at all — still
// reaches a page able to say so.
import { installCrashReporting, refreshCrashOverlay } from './utils/crashOverlay.ts';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { runPendingDatabaseReset } from './utils/resetDatabase.ts';
import { createPolyglot } from './i18n/I18nContext';
import './index.css';
import { store } from './redux/store.ts';

// The crash panel cannot wait for the app's own locale — it lives in IndexedDB,
// which may be part of what broke — so it speaks the browser's language.
const crashLocale =
    (navigator.language || 'en').slice(0, 2) === 'ru' ? 'ru' : 'en';
const crashPolyglot = createPolyglot(crashLocale, refreshCrashOverlay);
const crashTranslate = (
    key: string,
    options?: Record<string, string | number>,
) => crashPolyglot.t(key, options);
installCrashReporting(crashTranslate);

const queryClient = new QueryClient();

// A database reset survives the reload as a flag, and is carried out here —
// before the app renders, while nothing has opened a connection to the database
// yet, which is when a deletion has its best chance.
runPendingDatabaseReset(crashTranslate).then(() => {
    createRoot(document.getElementById('root')!).render(
        <ErrorBoundary>
            <StrictMode>
                <Provider store={store}>
                    <QueryClientProvider client={queryClient}>
                        <App />
                    </QueryClientProvider>
                </Provider>
            </StrictMode>
        </ErrorBoundary>,
    );
});
