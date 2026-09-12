import { createPolyglot } from './i18n/I18nContext';

// A single Polyglot seeded from the real `en` locale, shared by component
// tests. Reusing the real translations (instead of per-test stub tables) keeps
// the tests honest about missing keys and removes the duplicated stubs; the
// instance is created once at module scope and reused on every render.
export const polyglot = createPolyglot('en');
