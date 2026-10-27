// Vitest setup for every test file. It lives under `src` so it is type-checked
// by the app project (JSX enabled) rather than the config project, which lets
// it reach the test polyglot.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { missingTranslations } from './i18n/missingKeys';
// Registers the missing-key hook on the shared polyglots.
import './testUtils';

// A missing translation is a product bug: the component renders its raw key
// where a label should be. The polyglot records those keys instead of only
// warning (see `testUtils.ts`), so they fail the test that rendered them
// instead of scrolling past as console noise.
afterEach(() => {
    if (missingTranslations.size) {
        const keys = [...missingTranslations].sort().join('\n  ');
        missingTranslations.clear();
        throw new Error(`Missing translations rendered:\n  ${keys}`);
    }
});
