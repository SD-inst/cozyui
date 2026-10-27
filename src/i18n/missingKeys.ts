// Keys a component asked for that no locale defines.
//
// Kept in its own module with no imports so both the test utilities (which
// record into it) and the vitest setup (which fails a test over it) can read it
// without pulling component modules into the config-side TypeScript project.
export const missingTranslations = new Set<string>();
