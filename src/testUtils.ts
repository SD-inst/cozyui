import Polyglot from 'node-polyglot';
import { missingTranslations } from './i18n/missingKeys';
import { createPolyglot, defaultValue } from './i18n/I18nContext';

// node-polyglot only console.warns about a key no locale defines, and vitest
// owns the console (it installs its own after setup files run), so the warning
// cannot be intercepted from the test setup. Hooking `onMissingKey` on the
// instance is exact: the recorded key is what a component asked for, and
// `vitest.setup.ts` fails the test that rendered one.
const recordMissingKeys = (polyglot: Polyglot) => {
    (polyglot as Polyglot & Partial<Polyglot.PolyglotOptions>).onMissingKey = (
        key: string,
    ) => {
        missingTranslations.add(key);
        return key;
    };
};

// A single Polyglot seeded from the real `en` locale, shared by component
// tests. Reusing the real translations (instead of per-test stub tables) keeps
// the tests honest about missing keys and removes the duplicated stubs; the
// instance is created once at module scope and reused on every render.
export const polyglot = createPolyglot('en');
recordMissingKeys(polyglot);
// A test that renders without replacing the context falls back to this one.
recordMissingKeys(defaultValue.polyglot);
