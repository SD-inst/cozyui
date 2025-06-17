import { PropsWithChildren, useMemo, useState } from 'react';
import { settings } from '../hooks/settings';
import { createPolyglot, I18nContext } from './I18nContext';
import { useStringSetting } from '../hooks/useSetting';

export const I18nContextProvider = ({ ...props }: PropsWithChildren) => {
    const [locale, setLocale] = useState('');
    const language = useStringSetting(settings.language, 'en', true);
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
