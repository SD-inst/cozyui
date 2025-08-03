import {
    KeyboardArrowDown,
    KeyboardArrowUp,
    KeyboardDoubleArrowDown,
    KeyboardDoubleArrowUp,
} from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { settings } from '../../hooks/settings';
import { useCurrentTab } from '../../hooks/useCurrentTab';
import { useIsPhone } from '../../hooks/useIsPhone';
import { useBooleanSetting, useMultiSetting } from '../../hooks/useSetting';
import { useTagsController } from '../../hooks/useTagsController';
import { useFilteredTabs } from '../contexts/WorkflowTabsContext';
import { Tags } from '../history/db';
import { TagSuggestion } from './TagSuggestion';
import { TextInput, TextInputProps } from './TextInput';

const controlKeys = [
    'ArrowUp',
    'ArrowDown',
    'PageUp',
    'PageDown',
    'Enter',
    'Tab',
];

const PAGE_SIZE = 10;

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

const wpHeight = 40;

const WeightPanel = ({
    open,
    updateWeight,
}: {
    open: boolean;
    updateWeight: (inc: number) => void;
}) => {
    const phone = useIsPhone();
    if (!phone) {
        return null;
    }
    return (
        <Box
            width='100%'
            position='fixed'
            top={open ? 0 : -wpHeight}
            height={wpHeight}
            zIndex={1000}
            left={0}
            bgcolor='ButtonFace'
            display='flex'
            flexDirection='row'
            gap={1}
            justifyContent='space-between'
            sx={{ transition: '200ms ease-out' }}
        >
            <Button onClick={() => updateWeight(1)}>
                <KeyboardDoubleArrowUp />
            </Button>
            <Button onClick={() => updateWeight(0.1)}>
                <KeyboardArrowUp />
            </Button>
            <Button onClick={() => updateWeight(-0.1)}>
                <KeyboardArrowDown />
            </Button>
            <Button onClick={() => updateWeight(-1)}>
                <KeyboardDoubleArrowDown />
            </Button>
        </Box>
    );
};

export const PromptInput = ({ ...props }: TextInputProps) => {
    const { setValue } = useFormContext();
    const [weightPanelOpen, setWeightPanelOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>();
    const wpShouldHide = useRef(false);
    const current_tab = useCurrentTab();
    const T2Itabs = useFilteredTabs('T2I');
    const enabledTabs = useMultiSetting(settings.tag_enabled_tabs, T2Itabs);
    const tagEnabled = enabledTabs?.includes(current_tab);
    const tagCompletionEnabled =
        useBooleanSetting(settings.tag_completion) && tagEnabled;
    const findRange = () => {
        if (!inputRef.current) {
            return null;
        }
        const text = inputRef.current.value;
        const pos = inputRef.current.selectionStart;
        if (pos === null) {
            return null;
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
                    return null;
                }
                if (text[segment_start] === '(') {
                    break;
                }
                segment_start--;
            }
            if (segment_start < 0) {
                return null;
            } else {
                segment_start++;
            }
            while (segment_end < text.length) {
                if (text[segment_end] === '(') {
                    return null;
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
                return null;
            }
        }
        return { segment_start, segment_end, text, add_brackets };
    };
    const updateWeight = (inc: number) => {
        if (!inputRef.current) {
            return;
        }
        inputRef.current.focus();
        wpShouldHide.current = false;
        const range = findRange();
        if (range === null) {
            return;
        }
        const { text, add_brackets } = range;
        let { segment_start, segment_end } = range;
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
    const tagsctl = useTagsController();
    const currentTag = () => {
        if (!inputRef.current) {
            return null;
        }
        const pos = inputRef.current.selectionStart;
        if (pos === null) {
            return null;
        }
        const text = inputRef.current.value.slice(0, pos);
        return /(?:[,. ]|^)([^,. ]*)$/.exec(text);
    };
    const handleTagSelected = (tag: string) => {
        if (!inputRef.current || !inputRef.current.selectionStart) {
            return;
        }
        const matches = currentTag();
        if (!matches || matches.length < 2 || !matches[1]) {
            return;
        }
        const comma =
            inputRef.current.value[inputRef.current.selectionStart] === ' '
                ? ','
                : ', ';
        const pos = matches.index ? matches.index + 1 : 0;
        const tagFiltered = tag.replace(/_/g, ' ');
        const text =
            inputRef.current.value.slice(0, pos) +
            tagFiltered +
            comma +
            inputRef.current.value.slice(inputRef.current.selectionStart);
        setValue(props.name, text);
        setTimeout(() => {
            if (inputRef.current) {
                const selpos = pos + tagFiltered.length + 2;
                inputRef.current.selectionStart = selpos;
                inputRef.current.selectionEnd = selpos;
            }
        });
        tagsctl.setOpen(false);
    };
    const handleTags = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const matches = currentTag();
        if (!matches || matches.length < 2 || !matches[1]) {
            tagsctl.setOpen(false);
            return;
        }
        tagsctl.setTag(matches[1].toLowerCase());
        if (
            (e.code >= 'KeyA' && e.code <= 'KeyZ') ||
            e.code.startsWith('Digit') ||
            e.code == 'Slash' ||
            e.code == 'Minus' ||
            !e.code
        ) {
            tagsctl.setOpen(true);
        }
        let inc = undefined;
        if (tagsctl.open) {
            if (e.key === 'ArrowUp') {
                inc = -1;
            }
            if (e.key === 'ArrowDown') {
                inc = 1;
            }
            if (e.key === 'PageUp') {
                inc = tagsctl.pos >= PAGE_SIZE ? -PAGE_SIZE : -tagsctl.pos;
            }
            if (e.key === 'PageDown') {
                inc =
                    tagsctl.tags.length - tagsctl.pos > PAGE_SIZE
                        ? PAGE_SIZE
                        : tagsctl.tags.length - tagsctl.pos - 1;
            }
            if (inc !== undefined) {
                e.preventDefault();
                tagsctl.move(inc);
                return;
            }
            if (e.key === 'Escape') {
                tagsctl.setOpen(false);
            }
            if (
                (e.key === 'Tab' || e.key === 'Enter') &&
                !e.shiftKey &&
                !e.ctrlKey &&
                tagsctl.currentTag
            ) {
                setTimeout(() => handleTagSelected(tagsctl.currentTag.name));
                e.preventDefault();
                return;
            }
        }
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        let inc = 0;
        if (e.key === 'ArrowUp' && e.ctrlKey) {
            inc = e.shiftKey ? 1 : 0.1;
        }
        if (e.key === 'ArrowDown' && e.ctrlKey) {
            inc = e.shiftKey ? -1 : -0.1;
        }
        if (inc === 0) {
            if (tagCompletionEnabled) {
                if (controlKeys.includes(e.key)) {
                    handleTags(e);
                } else {
                    // to use updated input field value
                    setTimeout(() => {
                        handleTags(e);
                    });
                }
            }
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        updateWeight(inc);
    };
    return (
        <>
            <TextInput
                multiline
                onKeyDown={handleKeyDown}
                inputRef={inputRef}
                onSelect={() => {
                    if (!inputRef.current) {
                        return;
                    }
                    const range = findRange();
                    if (range === null) {
                        setWeightPanelOpen(false);
                        return;
                    }
                    setWeightPanelOpen(range.segment_end > range.segment_start);
                }}
                onBlur={() => {
                    wpShouldHide.current = true;
                    // if we lost focus because the weight panel has been
                    // clicked, the ref will be set to false in updateWeight,
                    // otherwise it will stay true
                    setTimeout(() => {
                        if (wpShouldHide.current) {
                            setWeightPanelOpen(false);
                        }
                        tagsctl.setOpen(false);
                    });
                }}
                {...props}
                sx={{ mb: 2, ...props.sx }}
            />
            <TagSuggestion
                el={inputRef.current}
                {...tagsctl}
                onClick={(t: Tags) => handleTagSelected(t.name)}
            />
            <WeightPanel open={weightPanelOpen} updateWeight={updateWeight} />
        </>
    );
};
