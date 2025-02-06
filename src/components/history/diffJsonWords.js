import { Diff } from 'diff';

const jsonDiff = new Diff();
// Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
// dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
jsonDiff.useLongestToken = true;

const extendedWordChars =
    'a-zA-Z0-9_\\u{C0}-\\u{FF}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}';

const tokenizeIncludingWhitespace = new RegExp(
    `[${extendedWordChars}]+|\\s+|[^${extendedWordChars}]`,
    'ug'
);

jsonDiff.tokenize = function (value, options = {}) {
    let parts;
    if (options.intlSegmenter) {
        if (options.intlSegmenter.resolvedOptions().granularity != 'word') {
            throw new Error(
                'The segmenter passed must have a granularity of "word"'
            );
        }
        parts = Array.from(
            options.intlSegmenter.segment(value),
            (segment) => segment.segment
        );
    } else {
        parts = value.match(tokenizeIncludingWhitespace) || [];
    }
    const tokens = [];
    let prevPart = null;
    parts.forEach((part) => {
        if (/\s/.test(part)) {
            if (prevPart == null) {
                tokens.push(part);
            } else {
                tokens.push(tokens.pop() + part);
            }
        } else if (/\s/.test(prevPart)) {
            if (tokens[tokens.length - 1] == prevPart) {
                tokens.push(tokens.pop() + part);
            } else {
                tokens.push(prevPart + part);
            }
        } else {
            tokens.push(part);
        }

        prevPart = part;
    });
    return tokens;
};

jsonDiff.castInput = function (value, options) {
    const stringifyReplacer = (k, v) =>
        typeof v === 'undefined' ? undefinedReplacement : v;

    return typeof value === 'string'
        ? value
        : JSON.stringify(
              canonicalize(value, null, null, stringifyReplacer),
              stringifyReplacer,
              '  '
          );
};
jsonDiff.equals = function (left, right, options) {
    return Diff.prototype.equals.call(
        jsonDiff,
        left.replace(/,([\r\n])/g, '$1'),
        right.replace(/,([\r\n])/g, '$1'),
        options
    );
};

export function diffJsonWords(oldObj, newObj, options = {}) {
    return jsonDiff.diff(oldObj, newObj, options);
}

// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed. Accepts an optional replacer
export function canonicalize(obj, stack, replacementStack, replacer, key) {
    stack = stack || [];
    replacementStack = replacementStack || [];

    if (replacer) {
        obj = replacer(key, obj);
    }

    let i;

    for (i = 0; i < stack.length; i += 1) {
        if (stack[i] === obj) {
            return replacementStack[i];
        }
    }

    let canonicalizedObj;

    if ('[object Array]' === Object.prototype.toString.call(obj)) {
        stack.push(obj);
        canonicalizedObj = new Array(obj.length);
        replacementStack.push(canonicalizedObj);
        for (i = 0; i < obj.length; i += 1) {
            canonicalizedObj[i] = canonicalize(
                obj[i],
                stack,
                replacementStack,
                replacer,
                key
            );
        }
        stack.pop();
        replacementStack.pop();
        return canonicalizedObj;
    }

    if (obj && obj.toJSON) {
        obj = obj.toJSON();
    }

    if (typeof obj === 'object' && obj !== null) {
        stack.push(obj);
        canonicalizedObj = {};
        replacementStack.push(canonicalizedObj);
        let sortedKeys = [],
            key;
        for (key in obj) {
            /* istanbul ignore else */
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sortedKeys.push(key);
            }
        }
        sortedKeys.sort();
        for (i = 0; i < sortedKeys.length; i += 1) {
            key = sortedKeys[i];
            canonicalizedObj[key] = canonicalize(
                obj[key],
                stack,
                replacementStack,
                replacer,
                key
            );
        }
        stack.pop();
        replacementStack.pop();
    } else {
        canonicalizedObj = obj;
    }
    return canonicalizedObj;
}
