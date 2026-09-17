/**
 * Parses a structured prompt into named sections.
 *
 * A section header is a line of the form `// name` (two slashes, optional
 * spaces, section name); its content is everything from the next line up to
 * the following header (or the end of the text). Content is trimmed of
 * leading/trailing whitespace but preserved verbatim in between.
 */
export const parseStructuredPrompt = (
    text: string,
): Record<string, string> => {
    const sections: Record<string, string> = {};
    let current: string | null = null;
    let content: string[] = [];
    const flush = () => {
        if (current !== null) {
            sections[current] = content.join('\n').trim();
        }
    };
    for (const line of text.split('\n')) {
        const match = line.match(/^\/\/\s*(.+?)\s*$/);
        if (match) {
            flush();
            current = match[1];
            content = [];
        } else if (current !== null) {
            content.push(line);
        }
    }
    flush();
    return sections;
};

/**
 * Builds a structured prompt from named sections, in the given order.
 * Empty sections (empty/absent values) are skipped.
 */
export const buildStructuredPrompt = (
    entries: [string, string | undefined][],
): string => {
    const blocks: string[] = [];
    for (const [name, value] of entries) {
        if (value === undefined || value === '') {
            continue;
        }
        blocks.push(`// ${name}\n${value}`);
    }
    return blocks.join('\n');
};
