import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', '.yarn', '.pnp.*'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // eslint-plugin-react-hooks v7 turned on a batch of React-Compiler
            // rules in `recommended` that clash with long-standing project
            // patterns (latest-ref, setState in effects). Keep only the
            // classic hooks rules; silence the rest.
            ...Object.fromEntries(
                Object.keys(reactHooks.configs.recommended.rules)
                    .filter(
                        (rule) =>
                            rule !== 'react-hooks/rules-of-hooks' &&
                            rule !== 'react-hooks/exhaustive-deps',
                    )
                    .map((rule) => [rule, 'off']),
            ),
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            'no-warning-comments': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            'react-hooks/exhaustive-deps': [
                'error',
                {
                    additionalHooks: '(useLiveQuery)',
                },
            ],
        },
    }
);
