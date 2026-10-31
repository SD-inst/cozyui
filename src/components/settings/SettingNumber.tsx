import { TextField, TextFieldProps } from '@mui/material';
import { settings } from '../../hooks/settings';
import { useSettingEditor } from '../../hooks/useSetting';
import { useTranslate } from '../../i18n/I18nContext';

// A number setting is stored as text, so the row can hold anything: a minus
// typed by accident, an empty box after a select-all, a value carried in by a
// settings import. The consumer would then have to guess what such a value
// means, and a guess like "negative retention" reads as "delete sooner" while
// behaving as "keep forever".
const clamp = (value: number, min?: number, max?: number): number => {
    if (min !== undefined && value < min) {
        return min;
    }
    if (max !== undefined && value > max) {
        return max;
    }
    return value;
};

export const SettingNumber = ({
    name,
    defaultValue,
    min,
    max,
    step,
    ...props
}: {
    name: settings;
    defaultValue: number;
    min?: number;
    max?: number;
    step?: number;
} & Omit<TextFieldProps, 'label' | 'min' | 'max' | 'step'>) => {
    const tr = useTranslate();
    const [value, updateSetting] = useSettingEditor(name, '' + defaultValue);
    return (
        <TextField
            value={value}
            onChange={(e) => updateSetting(e.target.value)}
            // Mid-edit the field keeps whatever is typed — a half-written number
            // is normal, and clamping it would fight the keystroke. Leaving the
            // field is the moment the text becomes a setting.
            onBlur={() => {
                const parsed = Number(value);
                updateSetting(
                    value.trim() !== '' && Number.isFinite(parsed)
                        ? '' + clamp(parsed, min, max)
                        : '' + defaultValue,
                );
            }}
            // `input` is the wrapper component; `htmlInput` is the element the
            // browser's number behavior — the spinner, the range, the stepper —
            // actually lives on.
            slotProps={{ htmlInput: { type: 'number', min, max, step } }}
            label={tr(`settings.${name}`)}
            aria-label={tr(`settings.${name}`)}
            size='small'
            {...props}
        />
    );
};
