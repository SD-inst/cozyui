export const shiftStr = (a: string, b: number) => '' + (parseInt(a) + b);

export const shiftIds = (api: any, base: number) => {
    Object.keys(api).forEach((k) => {
        Object.keys(api[k].inputs).forEach((ik) => {
            if (
                typeof api[k].inputs[ik] === 'object' &&
                api[k].inputs[ik].length === 2
            ) {
                api[k].inputs[ik][0] = shiftStr(api[k].inputs[ik][0], base);
            }
        });
        api[shiftStr(k, base)] = api[k];
        delete api[k];
    });
};

export const getFreeNodeId = (api: any) =>
    Object.keys(api)
        .map((k) => parseInt(k))
        .reduce((a, k) => Math.max(a, k)) + 1;
