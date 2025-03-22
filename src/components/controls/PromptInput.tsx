import { useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { TextInput, TextInputProps } from './TextInput';

const roundNum = (x: number) => {
    let strx = x.toFixed(2);
    while (strx.length > 0) {
        if (strx.endsWith('0') || strx.endsWith('.')) {
            strx = strx.slice(0, -1);
        } else {
            break;
        }
    }
    if (!strx.length) {
        return '0';
    }
    return strx;
};

export const PromptInput = ({ ...props }: TextInputProps) => {
    const { setValue } = useFormContext();
    const inputRef = useRef<HTMLInputElement>();
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!inputRef.current) {
            return;
        }
        let inc = 0;
        if (e.key === 'ArrowUp' && e.ctrlKey) {
            inc = e.shiftKey ? 1 : 0.1;
        }
        if (e.key === 'ArrowDown' && e.ctrlKey) {
            inc = e.shiftKey ? -1 : -0.1;
        }
        if (inc === 0) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        const text = inputRef.current.value;
        const pos = inputRef.current.selectionStart;
        if (pos === null) {
            return;
        }
        let segment_start = pos;
        let segment_end = pos;
        let add_brackets = false;
        if (
            inputRef.current.selectionEnd &&
            inputRef.current.selectionEnd > pos
        ) {
            segment_end = inputRef.current.selectionEnd;
            if (
                text.slice(segment_start - 1, segment_start) !== '(' ||
                text.slice(segment_end, segment_end + 1) !== ':'
            ) {
                add_brackets = true;
            }
        } else {
            while (segment_start >= 0) {
                if (text[segment_start] === ')') {
                    return;
                }
                if (text[segment_start] === '(') {
                    break;
                }
                segment_start--;
            }
            if (segment_start < 0) {
                return;
            } else {
                segment_start++;
            }
            while (segment_end < text.length) {
                if (text[segment_end] === '(') {
                    return;
                }
                if (text[segment_end] === ')') {
                    const col_idx = text
                        .slice(segment_start, segment_end)
                        .lastIndexOf(':');
                    if (col_idx) {
                        segment_end += col_idx - (segment_end - segment_start);
                    }
                    break;
                }
                segment_end++;
            }
            if (segment_end === text.length) {
                return;
            }
        }
        const tag = text.slice(segment_start, segment_end);
        let text_before = text.slice(0, segment_start);
        let text_after = text.slice(segment_end);
        let val = 1;
        if (add_brackets) {
            text_before += '(';
            text_after = ')' + text_after;
            segment_start++;
            segment_end++;
        }
        if (text_after.startsWith(':')) {
            const bracket_pos = text_after.indexOf(')');
            if (bracket_pos) {
                val = parseFloat(text_after.slice(1, bracket_pos));
                text_after = text_after.slice(bracket_pos);
            }
        }
        val += inc;
        const valstr = roundNum(val);
        if (valstr === '1') {
            if (text_before.endsWith('(')) {
                text_before = text_before.slice(0, -1);
                segment_start--;
            }
            if (text_after.startsWith(')')) {
                text_after = text_after.slice(1);
                segment_end--;
            }
            setValue(props.name, text_before + tag + text_after);
        } else {
            setValue(props.name, text_before + tag + ':' + valstr + text_after);
        }
        setTimeout(
            () =>
                inputRef.current?.setSelectionRange(segment_start, segment_end),
            0
        );
    };
    return (
        <TextInput
            multiline
            sx={{ mb: 2 }}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            {...props}
        />
    );
};
