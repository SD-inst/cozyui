import { Change } from 'diff';

export as namespace diffJsonWords;

declare function diffJsonWords(
    oldObj: any,
    newObj: any,
    options?: any
): Change[];
