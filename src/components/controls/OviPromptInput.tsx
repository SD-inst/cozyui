import { Box, Button, ButtonProps } from '@mui/material';
import { RefObject, useRef } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { TextInput, TextInputProps } from './TextInput';
import { useFormContext } from 'react-hook-form';

const TagButton = ({
    name,
    label,
    tagOpen,
    tagClose,
    inputRef,
    ...props
}: ButtonProps & {
    name: string;
    label: string;
    tagOpen: string;
    tagClose: string;
    inputRef: RefObject<HTMLInputElement>;
}) => {
    const { setValue } = useFormContext();
    const tr = useTranslate();
    const handleClick = () => {
        if (!inputRef || !inputRef.current) {
            return;
        }
        const input = inputRef.current;
        input.focus();
        const selStart = input.selectionStart;
        const selEnd = input.selectionEnd;
        if (selStart === null || selEnd === null) {
            return;
        }
        const value = input.value;
        const text = value.slice(selStart, selEnd);
        const textBefore = value.slice(0, selStart);
        const textAfter = value.slice(selEnd);
        if (textBefore.endsWith('>') && textAfter.startsWith('<')) {
            // remove tags
            let openTagStart = selStart - 1;
            while (openTagStart >= 0) {
                if (value[openTagStart] === '<') {
                    break;
                }
                openTagStart--;
            }
            if (openTagStart < 0) {
                return;
            }
            let closeTagEnd = selEnd + 1;
            while (closeTagEnd < value.length) {
                if (value[closeTagEnd] === '>') {
                    break;
                }
                closeTagEnd++;
            }
            if (closeTagEnd === value.length) {
                return;
            }
            const updatedValue =
                value.slice(0, openTagStart) +
                value.slice(selStart, selEnd) +
                value.slice(closeTagEnd + 1);
            setValue(name, updatedValue);
            setTimeout(() => {
                input.setSelectionRange(
                    openTagStart,
                    openTagStart + selEnd - selStart
                );
            }, 0);
            return;
        }
        setValue(name, textBefore + tagOpen + text + tagClose + textAfter);
        setTimeout(() => {
            input.setSelectionRange(
                textBefore.length + tagOpen.length,
                textBefore.length + tagOpen.length + text.length
            );
        }, 0);
    };
    return (
        <Button
            color='primary'
            variant='contained'
            size='small'
            onClick={handleClick}
            {...props}
        >
            {tr(`controls.${label}`)}
        </Button>
    );
};

export const OviPromptInput = ({ ...props }: TextInputProps) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <Box display='flex' flexDirection='column' mb={2}>
            <TextInput inputRef={ref} multiline {...props} />
            <Box display='flex' flexDirection='row' gap={2}>
                <TagButton
                    name={props.name}
                    label='speech'
                    tagOpen='<S>'
                    tagClose='<E>'
                    inputRef={ref}
                />
                <TagButton
                    name={props.name}
                    label='audio'
                    tagOpen='<AUDCAP>'
                    tagClose='<ENDAUDCAP>'
                    inputRef={ref}
                />
            </Box>
        </Box>
    );
};
