import { statusEnum } from '../../redux/progress';

const translation = {
    controls: {
        width: 'width',
        height: 'height',
        max_width: 'max width',
        max_height: 'max height',
        length: 'length',
        steps: 'steps',
        cfg: 'CFG',
        guidance: 'guidance scale',
        flow_shift: 'flow shift',
        wave_speed: 'WaveSpeed cache',
        wave_speed_maxhit: 'WaveSpeed max hits',
        size: 'max size',
        tea_cache: 'Tea Cache',
        enhance_video: 'Enhance-a-Video weight',
        aug_strength: 'Noise augmentation',
        latent_strength: 'Latent strength',
        stg: 'STG',
        stg_rescale: 'STG rescale',
        stg_mode: 'STG mode',
        compression: 'compression',
        neg_prompt: 'negative prompt',
        scheduler: 'scheduler',
        sampler: 'sampler',
        seed: 'seed',
        prompt: 'prompt',
        model: 'model',
        suffix: 'description suffix',
        llm: 'LLM for description',
        attention: 'attention',
        generate: 'Generate',
        interrupt: 'Interrupt',
        describe: 'Describe',
        advanced_parameters: 'Advanced parameters',
        video: 'Video',
        audio: 'Audio',
        download: 'Download',
        single_blocks: 'Single blocks',
        double_blocks: 'Double blocks',
        offload_txt_in: 'Offload txt in',
        offload_img_in: 'Offload img in',
        block_swap: 'Enable block swap (saves VRAM, slow)',
        lora: 'LoRA',
        lora_reload: 'Reload lora list',
        randomize_seed: 'Randomize seed',
        history: 'History',
        history_empty: 'Nothing yet',
        filter: 'Filter',
        settings: 'Settings',
        ok: 'OK',
        cancel: 'Cancel',
        close: 'Close',
        queued: 'Queued: %{queue}',
        compare_arr_with_this: 'Compare <--> with this',
        compare_prev: 'Compare with previous',
        compare_this_with: 'Compare this with...',
        reset_comparison: 'Reset comparison',
        show_params: 'Show params',
        generation_params: 'Generation params',
        difference: 'Difference',
        image: 'image',
        image_end: 'end image (optional)',
        drop_files_here: 'Drop the files here...',
        drop_files_desc:
            "Drag'n'drop some files here, or click to select files",
        merge_type: 'merge type',
        merge_type_single: 'Single blocks only',
        merge_type_double: 'Double blocks only',
        merge_type_full: 'Full',
        weight: 'weight',
        change_lora_merge_params: 'Change lora merge params',
        delete_result: 'Delete result',
        confirm_delete_result: 'Are you sure you want to delete this result?',
        unknown_media: 'Unknown media type',
        duration: '[%{sec} s]',
        pin: 'Pin',
        unpin: 'Unpin',
        unpin_title: 'Unpinning result',
        unpin_confirm:
            'Are you sure you want to unpin this result? It would become possible to delete it using clear history.',
        reset_form: 'Reset form',
        confirm_reset: 'Confirm reset',
        confirm_reset_content:
            'Are you sure you want to reset the fields in this tab to their default values?',
        import_history: 'Import history',
        export_history: 'Export history',
        please_wait: 'Please wait...',
        denoise: 'denoise',
        upscale: 'upscale',
        send_to_upscale: 'Send to upscale',
        allow_upscale: 'allow upscale',
        clip_model: 'CLIP LLM model'
    },
    settings: {
        select_language: 'Select language',
        save_history: 'Save history locally',
        save_outputs_locally: 'Save generation results locally',
        disable_help: 'Disable tooltips',
        notification: 'Notification sound',
        notification_name: 'Sound effect #%{number}',
        notification_none: 'None',
        unit: 'Unit',
        newer: 'Newer',
        older: 'Older',
        clear: 'Clear %{cmp}',
        seconds: 'second |||| seconds',
        minutes: 'minute |||| minutes',
        hours: 'hour |||| hours',
        days: 'day |||| days',
        weeks: 'week |||| weeks',
        months: 'month |||| months',
        years: 'year |||| years',
        nothing_to_delete: 'Nothing to delete',
        nothing_to_delete_text:
            'There are no results %{cmp} than %{number} %{unit}.',
        clear_history: 'Clear history',
        clear_history_text:
            'Are you sure you want to delete history %{cmp} than %{number} %{unit}?<br />%{toDelete}',
        to_delete:
            '<b>%{smart_count} result</b> will be deleted. |||| <b>%{smart_count} results</b> will be deleted.',
    },
    help: {
        sampler:
            "Samplers guide denoising using different algorithms. Some are more correct and produce more details, but they're slower. Experiment and see for yourself.",
        scheduler:
            'Defines time step distribution. There are usually 1000 steps in these models, but we only sample 10-50 instead. Scheduler decides which exact steps out of 1000 to choose. May increase or decrease quality and artifacts.',
        flow_shift: 'Increase to stabilize motion at low number of steps (<20)',
        wave_speed:
            "Defines whether to reuse the previous step results. If the first layer's output changed by less than N compared to the previous step (0.1 or 10% by default), the last layer's output is reused instead of doing a full calculation. If you get floaty background that follows other movements, try reducing this.",
        wave_speed_maxhit:
            'This many consecutive steps can use the caching trick, after which a full calculation will be forced. 0 disables caching (every step will be fully calculated), -1 allows unlimited consecutive steps being cached. If you get floaty background that follows other movements, try reducing this. If you want to accelerate render, set to a higher value or -1.',
        guidance:
            "Prompt weight, if the result doesn't follow the prompt well, or if you see disappearing limbs and objects, increase this.",
        seed: "Seed is the reproduction number. To get a new result for the same parameters pick another seed. They're not correlated and even if you change it by just 1 the result would be unpredictably different. Same seed always produces the same result (if the other parameters are unchanged).",
        lora: "LoRA (low-rank adaptation) is a method to add new concepts to the model, such as characters (people), movements, gestures, styles and so on. Multiple loras can be combined together with different weights. It's advised to use lower weights if you get any weird artifacts, especially if combining several loras.",
    },
    toasts: {
        disconnected: 'Disconnected',
        connected: 'Connected!',
        error_getting_config: 'Error getting config: %{err}',
        error_obj_info: 'Error getting object info: %{err}',
        objects_updated: 'Objects updated',
        execution_skipped: 'Execution skipped',
        error_processing_handler: 'Error processing handler of %{name}: %{err}',
        reloaded_objects: 'Reloaded objects',
        no_prev_result: 'Previous result was not found',
        no_base: 'No base result chosen for comparison',
        no_params: 'No generation parameters stored',
        params_restored: 'Generation parameters restored',
        error_saving_history: 'Error saving history: %{err}',
        error_importing_database: 'Error importing history: %{err}',
        error_exporting_database: 'Error exporting history: %{err}',
        error_uploading: 'Error uploading image: %{err}',
    },
    status: {
        [statusEnum.WAITING]: 'Waiting...',
        [statusEnum.RUNNING]: 'Running',
        [statusEnum.FINISHED]: 'Finished',
        [statusEnum.ERROR]: 'Error',
        [statusEnum.INTERRUPTED]: 'Interrupted',
        [statusEnum.CANCELLED]: 'Cancelled',
    },
    errors: {
        missing_controls: 'Missing controls (present in API): %{list}',
        missing_bindings: 'Missing API bindings (present controls): %{list}',
        missing_ids: 'Missing API ids: %{list}',
        missing_fields: 'Missing API fields: %{list}',
        interrupted: 'interrupted',
    },
};

export default translation;
