import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';

export type TKeyframe = {
    image: string;
    position: number;
    strength: number;
    enabled: boolean;
};

export const keyframeHandler = (
    api: any,
    value: TKeyframe[],
    control: controlType
) => {
    if (!value) {
        return;
    }
    const { cond_node_id, vae_node_id, concat_node_id } = control;
    const prevNodeCond = {
        positive: api[cond_node_id].inputs.positive,
        negative: api[cond_node_id].inputs.negative,
    };
    const prevNodeLatent = {
        latent: api[concat_node_id].inputs.video_latent,
    };
    value.forEach((v) => {
        if (!v.enabled) {
            return;
        }
        const graph = {
            ':1': {
                inputs: {
                    image: v.image,
                },
                class_type: 'LoadImage',
                _meta: {
                    title: 'Load Image',
                },
            },
            ':2': {
                inputs: {
                    ...prevNodeCond,
                    ...prevNodeLatent,
                    vae: [vae_node_id, 2],
                    frame_idx: v.position,
                    strength: v.strength,
                    image: [':1', 0],
                },
                class_type: 'LTXVAddGuide',
                _meta: {
                    title: 'LTXVAddGuide',
                },
            },
        };
        const newNodeID = insertGraph(api, graph) + ':2';
        prevNodeCond.positive = [newNodeID, 0];
        prevNodeCond.negative = [newNodeID, 1];
        prevNodeLatent.latent = [newNodeID, 2];
    });
    api[cond_node_id].inputs.positive = prevNodeCond.positive;
    api[cond_node_id].inputs.negative = prevNodeCond.negative;
    api[concat_node_id].inputs.video_latent = prevNodeLatent.latent;
};
