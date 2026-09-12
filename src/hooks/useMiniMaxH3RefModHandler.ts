import { useEventCallback } from '@mui/material';
import { db } from '../components/history/db';
import { ensureFileOnServer } from '../api/files';
import { Workflow, NodeRef } from '../api/graph';
import { controlType } from '../redux/config';
import { useApiURL } from './useApiURL';
import { insertGraph } from '../api/utils';
import { activeEntries } from '../utils/arraySlots';

const MAX_SLOTS = 8;
const NONE = '(none)';

export const useMiniMaxH3RefModHandler = () => {
    const apiUrl = useApiURL();
    return useEventCallback(
        async (api: Workflow, value: any, control: controlType) => {
            if (!value || !value.length || !control.cond_node_id || !apiUrl)
                return;

            // Resolve the active mods to filenames in the server's input
            // folder: reuse the stored name if the file is still there,
            // otherwise (re-)upload it and remember the new name for next
            // time. Skipped entries are treated as absent, so the active mods
            // fill the slots in order (no gaps).
            type RefModEntry = {
                id: string;
                strength?: number;
                copies?: number;
                skip?: boolean;
            };
            const resolved: Array<{
                name: string;
                strength: number;
                copies: number;
            }> = [];
            for (const entry of activeEntries(value as RefModEntry[])) {
                const { id } = entry;
                const file = await db.refModFiles
                    .where({ mod: id })
                    .and((f: any) => f.fileType === 'safetensors')
                    .first();
                if (!file) continue;
                const mod = await db.refMods.get(id);
                const name = await ensureFileOnServer(
                    new File(
                        [file.file],
                        file.filename,
                        { type: 'application/octet-stream' },
                    ),
                    mod?.serverFilename,
                    apiUrl,
                );
                if (mod && mod.serverFilename !== name) {
                    await db.refMods.update(id, { serverFilename: name });
                }
                resolved.push({
                    name,
                    strength: entry?.strength ?? 1.0,
                    copies: entry?.copies ?? 1,
                });
            }
            if (!resolved.length) return;

            // Build a sub-graph: loader → apply
            const loaderInputs: Record<string, any> = {
                show_info: false,
            };
            for (let i = 1; i <= MAX_SLOTS; i++) {
                const r = resolved[i - 1];
                if (r) {
                    loaderInputs[`mod_${i}`] = r.name;
                    loaderInputs[`strength_${i}`] = r.strength;
                    loaderInputs[`copies_${i}`] = r.copies;
                } else {
                    loaderInputs[`mod_${i}`] = NONE;
                    loaderInputs[`strength_${i}`] = 1.0;
                    loaderInputs[`copies_${i}`] = 1;
                }
            }

            const graph: Workflow = {
                ':loader': {
                    inputs: loaderInputs,
                    class_type: 'MiniMaxH3RefModsLoader',
                    _meta: { title: 'Load H3 RefMods' },
                },
                ':apply': {
                    inputs: {
                        conditioning: [control.cond_node_id, 0],
                        mods: [':loader', 0],
                        override: false,
                        retention: 1.0,
                        curve_direction: 'constant',
                        curve_shape: 'linear',
                        curve_value: 1.0,
                        scramble_seed: -1,
                    },
                    class_type: 'MiniMaxH3RefModApply',
                    _meta: { title: 'Apply H3 RefMods' },
                },
            };

            const baseID = insertGraph(api, graph);
            const applyID = baseID + ':apply';

            // Rewire: replace conditioning reference in the consumer node
            if (control.cond_consumer_node_id) {
                const consumer = api[control.cond_consumer_node_id];
                const condField = 'conditioning';
                if (consumer.inputs[condField]) {
                    const current = consumer.inputs[condField] as
                        | NodeRef
                        | string;
                    if (
                        Array.isArray(current) &&
                        current[0] === control.cond_node_id
                    ) {
                        consumer.inputs[condField] = [applyID, 0];
                    }
                }
            }
        },
    );
};
