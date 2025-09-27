import { useEventCallback } from '@mui/material';
import Polyglot from 'node-polyglot';
import { createContext, useContext } from 'react';
import en from './locales/en';

export type I18nContextType = {
    locale: string;
    polyglot: Polyglot;
};

export const createPolyglot = (locale: string = 'en', updater?: () => void) => {
    const polyglot = new Polyglot({ locale });
    polyglot.extend(en);
    import(`./locales/${locale}.ts`).then((m) => {
        polyglot.extend(m.default);
        if (updater) {
            updater(); // trigger re-render
        }
    });
    return polyglot;
};

export const defaultValue: I18nContextType = {
    locale: '',
    polyglot: createPolyglot(),
};

export const I18nContext = createContext<I18nContextType>(defaultValue);

export const useTranslate = () => {
    const polyglot = useContext(I18nContext).polyglot;
    return useEventCallback(
        (phrase: string, options?: number | Polyglot.InterpolationOptions) => {
            return polyglot.t(phrase, options);
        }
    );
};

export const useTranslateReady = () => {
    const ctx = useContext(I18nContext);
    return !!ctx.locale;
};
