import { PropsWithChildren, useMemo, useState } from 'react';
import { settings } from '../hooks/settings';
import { useStringSetting } from '../hooks/useStringSetting';
import { createPolyglot, I18nContext } from './I18nContext';

export const I18nContextProvider = ({ ...props }: PropsWithChildren) => {
    const [locale, setLocale] = useState('');
    const language = useStringSetting(settings.language);
    const polyglot = useMemo(() => {
        // language is '' until dexie promise resolves, not setting locale but creating a temporary polyglot instance with English locale to show something
        setLocale('');
        return createPolyglot(language || 'en', () => {
            if (!language) {
                return;
            }
            setLocale(language);
        });
    }, [language]);
    return (
        <I18nContext.Provider
            value={{
                polyglot,
                locale,
            }}
        >
            {props.children}
        </I18nContext.Provider>
    );
};
