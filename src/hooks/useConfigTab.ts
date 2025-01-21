import { get } from 'lodash';
import { useAppSelector } from '../redux/hooks';
import { useCurrentTab } from '../components/WorkflowTabs';

const emptyParams = {
    api: '',
    controls: {} as any,
    result: {} as any,
    lora_params: {} as {
        input_node_id?: string;
        lora_input_name: string;
        api_input_name: string;
        output_idx?: number;
        output_node_ids: string[];
        class_name: string;
        strength_field_name: string;
        name_field_name: string;
    },
};

export const useConfigTab = (tabOverride?: string) => {
    const current_tab = useCurrentTab(tabOverride);
    return useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"]`, emptyParams)
    );
};
