import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { Workflow, isNodeRef } from './graph';
import { getCreateVideoNodeId } from './utils';

// The app config and its API workflows live in public/ (outside src/), so read
// them from disk rather than through the bundler.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string): any =>
    JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));

const config = read('public/conf/config.json') as {
    tabs: Record<
        string,
        {
            api?: string;
            result?: ResultEntry | ResultEntry[];
            controls?: Record<string, Record<string, string>>;
        }
    >;
};

type ResultEntry = { id?: string; type?: string };

/** Collects every gifs result entry across all tabs, with its workflow. */
const collectGifs = (): { tab: string; api: Workflow; id: string }[] => {
    const out: { tab: string; api: Workflow; id: string }[] = [];
    for (const [tab, tabCfg] of Object.entries(config.tabs)) {
        const results = tabCfg.result;
        if (!results || !tabCfg.api) {
            continue;
        }
        const list = Array.isArray(results) ? results : [results];
        for (const r of list) {
            if (r.type !== 'gifs' || !r.id) {
                continue;
            }
            const api = read(`public/${tabCfg.api}`) as Workflow;
            out.push({ tab, api, id: r.id });
        }
    }
    return out;
};

describe('config.json — gifs result wiring', () => {
    const gifs = collectGifs();

    it('has at least one gifs result to check', () => {
        expect(gifs.length).toBeGreaterThan(0);
    });

    it('every gifs result.id points to a SaveVideo that feeds a CreateVideo', () => {
        const problems: string[] = [];
        for (const { tab, api, id } of gifs) {
            const node = api[id];
            if (!node) {
                problems.push(`${tab}: result.id='${id}' does not exist in the API`);
                continue;
            }
            if (node.class_type !== 'SaveVideo') {
                problems.push(
                    `${tab}: result.id='${id}' is '${node.class_type}', expected SaveVideo`,
                );
                continue;
            }
            const video = node.inputs.video;
            if (!isNodeRef(video)) {
                problems.push(`${tab}: SaveVideo '${id}' has no 'video' node reference`);
                continue;
            }
            const target = api[video[0]];
            if (!target || target.class_type !== 'CreateVideo') {
                problems.push(
                    `${tab}: SaveVideo '${id}' video ref -> '${video[0]}' is not a CreateVideo`,
                );
            }
        }
        expect(problems).toEqual([]);
    });

    it('getCreateVideoNodeId resolves a CreateVideo for every gifs tab', () => {
        const problems: string[] = [];
        for (const { tab, api, id } of gifs) {
            const cvId = getCreateVideoNodeId(api, id);
            const cvNode = api[cvId];
            if (!cvNode || cvNode.class_type !== 'CreateVideo') {
                problems.push(
                    `${tab}: getCreateVideoNodeId('${id}') -> '${cvId}' is not a CreateVideo`,
                );
            }
        }
        expect(problems).toEqual([]);
    });
});

/**
 * Every tab that offers ref mods names the conditioning node to inject into and
 * the node that consumes it, in its own control entry. The apply node is only
 * wired in when the consumer really reads that conditioning node, so a stale id
 * silently drops every mod from the run.
 */
describe('config.json — refmods wiring', () => {
    const refModTabs = Object.entries(config.tabs).flatMap(
        ([tab, tabCfg]) => {
            const control = tabCfg.controls?.refmods;
            if (!tabCfg.api || !control) {
                return [];
            }
            return [
                {
                    tab,
                    api: read(`public/${tabCfg.api}`) as Workflow,
                    control,
                },
            ];
        },
    );

    it('has tabs with refmods to check', () => {
        expect(refModTabs.length).toBeGreaterThan(0);
    });

    it('the named conditioning node feeds the named consumer', () => {
        const problems: string[] = [];
        for (const { tab, api, control } of refModTabs) {
            const { cond_node_id: cond, cond_consumer_node_id: consumer } =
                control;
            if (!cond || !consumer) {
                problems.push(`${tab}: refmods needs cond_node_id and cond_consumer_node_id`);
                continue;
            }
            if (!api[cond]) {
                problems.push(`${tab}: refmods cond_node_id='${cond}' is not in the API`);
            }
            const node = api[consumer];
            if (!node) {
                problems.push(`${tab}: refmods cond_consumer_node_id='${consumer}' is not in the API`);
                continue;
            }
            if (!isNodeRef(node.inputs.conditioning) || node.inputs.conditioning[0] !== cond) {
                problems.push(
                    `${tab}: refmods consumer '${consumer}' does not read conditioning from '${cond}'`,
                );
            }
        }
        expect(problems).toEqual([]);
    });
});
