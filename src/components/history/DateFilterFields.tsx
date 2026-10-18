import { Checkbox, FormControlLabel } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { useContext } from 'react';
import { I18nContext, useTranslate } from '../../i18n/I18nContext';

/**
 * Date range + pinned filter fields. `@mui/x-date-pickers` and dayjs are big
 * and only these (rarely used, advanced) filters need them, so this module is
 * loaded via dynamic import — see `HistoryPanel`.
 */
export const DateFilterFields = ({
    dateFrom,
    dateTo,
    pinned,
    setDateFrom,
    setDateTo,
    setPinned,
}: {
    dateFrom: string;
    dateTo: string;
    pinned: boolean;
    setDateFrom: (v: string) => void;
    setDateTo: (v: string) => void;
    setPinned: (v: boolean) => void;
}) => {
    const tr = useTranslate();
    const { locale } = useContext(I18nContext);
    // Russian: fixed ru locale (day-first, Russian names). English: follow the
    // browser region — the US is month-first (MM/DD/YYYY), every other region
    // day-first (DD.MM.YYYY).
    const isRussian = locale === 'ru';
    const adapterLocale = isRussian ? 'ru' : 'en';
    const dateFormat = isRussian
        ? undefined
        : navigator.language === 'en-US'
            ? 'MM/DD/YYYY'
            : 'DD.MM.YYYY';
    return (
        <>
            <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={adapterLocale}
            >
                <DatePicker
                    label={tr('controls.date_from')}
                    value={dateFrom ? dayjs(dateFrom) : null}
                    format={dateFormat}
                    onChange={(v) =>
                        setDateFrom(v ? v.format('YYYY-MM-DD') : '')
                    }
                    slotProps={{
                        textField: {
                            size: 'small',
                            sx: { width: 170, mr: 1, mb: 2 },
                        },
                    }}
                />
                <DatePicker
                    label={tr('controls.date_to')}
                    value={dateTo ? dayjs(dateTo) : null}
                    format={dateFormat}
                    onChange={(v) => setDateTo(v ? v.format('YYYY-MM-DD') : '')}
                    slotProps={{
                        textField: {
                            size: 'small',
                            sx: { width: 170, mb: 2 },
                        },
                    }}
                />
            </LocalizationProvider>
            <FormControlLabel
                label={tr('controls.pinned')}
                control={
                    <Checkbox checked={pinned} onChange={(_, c) => setPinned(c)}
                    />
                }
                sx={{ ml: 0, mb: 2 }}
            />
        </>
    );
};
