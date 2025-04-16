import { statusEnum } from '../../redux/progress';

const translation = {
    controls: {
        width: 'ширина',
        height: 'высота',
        max_width: 'макс. ширина',
        max_height: 'макс. высота',
        length: 'длительность',
        steps: 'шаги',
        cfg: 'CFG',
        guidance: 'гайданс',
        flow_shift: 'сдвиг потока',
        wave_speed: 'кэш WaveSpeed',
        wave_speed_maxhit: 'макс. попаданий WaveSpeed',
        wave_speed_start: 'начало WaveSpeed',
        wave_speed_end: 'конец WaveSpeed',
        size: 'макс. размер',
        tea_cache: 'Tea Cache',
        enhance_video: 'вес Enhance-a-Video',
        aug_strength: 'добавление шума',
        latent_strength: 'сила латента',
        stg: 'STG',
        stg_rescale: 'STG рескейл',
        stg_mode: 'режим STG',
        compression: 'сжатие',
        neg_prompt: 'негативный промпт',
        scheduler: 'планировщик',
        sampler: 'сэмплер',
        seed: 'сид',
        prompt: 'промпт',
        model: 'модель',
        suffix: 'суффикс после описания',
        llm: 'LLM для описания',
        attention: 'аттеншен',
        generate: 'Сгенерировать',
        describe: 'Описать',
        interrupt: 'Прервать',
        advanced_parameters: 'Расширенные параметры',
        video: 'Видео',
        audio: 'Аудио',
        download: 'Скачать',
        single_blocks: 'Единые блоки',
        double_blocks: 'Двойные блоки',
        offload_txt_in: 'Выгружать txt in',
        offload_img_in: 'Выгружать img in',
        block_swap: 'Включить выгрузку блоков (экономит VRAM, замедляет)',
        lora: 'LoRA',
        lora_reload: 'Перезагрузить список лор',
        randomize_seed: 'Случайный сид',
        history: 'История',
        history_empty: 'Пока пусто',
        filter: 'Фильтр',
        settings: 'Настройки',
        ok: 'ОК',
        cancel: 'Отмена',
        close: 'Закрыть',
        queued: 'Очередь: %{queue}',
        compare_arr_with_this: 'Сравнить <--> с этим',
        compare_prev: 'Сравнить с предыдущим',
        compare_this_with: 'Сравнить это с...',
        reset_comparison: 'Сбросить сравнение',
        show_params: 'Показать параметры',
        generation_params: 'Параметры генерации',
        difference: 'Различия',
        image: 'изображение',
        image_end: 'конечное изображение (необязательно)',
        drop_files_here: 'Перетащите файлы сюда...',
        drop_files_desc: 'Перетащите файлы сюда или кликните для выбора файлов',
        merge_type: 'тип слияния',
        merge_type_single: 'Только единые блоки',
        merge_type_double: 'Только двойные блоки',
        merge_type_full: 'Полностью',
        strength: 'сила',
        change_lora_merge_params: 'Изменить параметры слияния лоры',
        delete_result: 'Удалить результат',
        confirm_delete_result: 'Вы уверены, что хотите удалить этот результат?',
        unknown_media: 'Неизвестный тип медии',
        duration: '[%{sec} с]',
        pin: 'Закрепить',
        unpin: 'Открепить',
        pinned: 'Закреплённое',
        unpin_title: 'Открепить результат',
        unpin_confirm:
            'Вы уверены, что хотите открепить этот результат? Его станет возможно удалить через очистку истории.',
        reset_form: 'Сброс',
        confirm_reset: 'Подтвердите сброс',
        confirm_reset_content:
            'Вы уверены, что хотите сбросить поля на этой вкладке на значения по умолчанию?',
        import_history: 'Импорт истории',
        export_history: 'Экспорт истории',
        please_wait: 'Пожалуйста, подождите...',
        denoise: 'денойз',
        upscale: 'увеличение',
        send_to_upscale: 'Отправить на увеличение',
        allow_upscale: 'разрешить увеличение',
        clip_model: 'модель CLIP LLM',
        tab_json_diff: 'Параметры',
        tab_media_diff: 'Медиа',
        virtual_vram: 'виртуальная VRAM',
        riflex: 'RIFLEx',
    },
    settings: {
        select_language: 'Выбор языка',
        save_history: 'Сохранять историю локально',
        save_outputs_locally: 'Сохранять результаты локально',
        disable_help: 'Отключить подсказки',
        enable_previews: 'Включить предпросмотр',
        notification: 'Звук уведомления',
        notification_name: 'Звуковой эффект №%{number}',
        notification_none: 'Нет',
        unit: 'Единица',
        newer: 'Новее',
        older: 'Старее',
        clear: 'Удалить %{cmp}',
        seconds: 'секунда |||| секунды |||| секунд',
        minutes: 'минута |||| минуты |||| минут',
        hours: 'час |||| часа |||| часов',
        days: 'день |||| дня |||| дней',
        weeks: 'неделя |||| недели |||| недель',
        months: 'месяц |||| месяца |||| месяцев',
        years: 'год |||| года |||| лет',
        nothing_to_delete: 'Нечего удалять',
        nothing_to_delete_text:
            'Нет результатов %{cmp}, чем %{number} %{unit}.',
        clear_history: 'Очистка истории',
        clear_history_text:
            'Вы уверены, что хотите удалить результаты %{cmp}, чем %{number} %{unit}?<br />%{toDelete}',
        to_delete:
            '<b>%{smart_count} результат<b> будет удалён. |||| <b>%{smart_count} результата</b> будут удалены. |||| <b>%{smart_count} результатов</b> будут удалены.',
        prompt_active:
            'Фильтр активен! Будут удалены объекты, подходящие под "%{prompt}"',
        pinned_active: 'Только закреплённые объекты будут удалены!',
        version: 'версия: %{version}',
    },
    help: {
        sampler:
            'Сэмплер управляет удалением шума с изображения с помощью различных алгоритмов. Некоторые сэмплеры более корректны и создают больше деталей, но они также медленнее. Экспериментируйте.',
        scheduler:
            'Планировщик определяет распределение шагов во времени. Обычно модель обучается на 1000 шагах, но мы используем только 10-50. Планировщик решает, какие именно шаги выбрать из этих 1000. Может улучшить или ухудшить качество и создать артефакты.',
        flow_shift:
            'Увеличьте для стабилизации движения при малом числе шагов (<20)',
        wave_speed:
            'Определяет, переиспользовать ли результаты предыдущего шага. Если выход первого слоя изменился менее чем на N по сравнению с предыдущим шагом (0.1 или 10% по умолчанию), то вместо полного вычисления используется выход последнего слоя с предыдущего шага. Если вы замечаете плавающий фон, который движется вслед за другими движениями, уменьшите этот параметр.',
        wave_speed_maxhit:
            'Столько шагов подряд могут использовать трюк с кэшированием, после чего будет форсировано полное вычисление. 0 отключает кэширование (каждый шаг будет полностью просчитан), -1 разрешает кэшировать неограниченное число шагов подряд. Если вы замечаете плавающий фон, который движется вслед за другими движениями, уменьшите этот параметр. Для ускорения рендера задайте большее число или -1.',
        wave_speed_start:
            'WaveSpeed активируется с этого шага (задаётся как доля от общего числа шагов). Увеличьте значение, если видео содержит артефакты движения, чтобы больше шагов в начале генерации было рассчитано полностью, без ускорения. Ранние шаги определяют общую структуру видео, а поздние шаги улучшают мелкие детали.',
        wave_speed_end:
            'WaveSpeed перестанет работать после этого шага (задаётся как доля от общего числа шагов). Уменьшите значение, если вам нужно больше деталей. Ранние шаги определяют общую структуру видео, а поздние шаги улучшают мелкие детали.',
        guidance:
            'Вес промпта, если результат недостаточно соответствует описанию, или если вы замечаете пропадающие конечности и объекты, увеличьте это значение.',
        seed: 'Сид — это число репродуцирования. Чтобы получить новый результат для при неизменных остальных параметрах, поменяйте сид. Сиды не связаны друг с другом, так что изменение даже на 1 даст непредсказуемо отличающийся результат. Но один и тот же сид всегда выдаёт один и тот же результат (если не менять остальные параметры).',
        lora: 'LoRA (low-rank adaptation) — это метод добавления новых концептов в модель, таких как персонажи (люди), движения, жесты, стили и т.п. Вы можете комбинировать несколько лор с разной силой. Если вы замечаете странные артефакты, попробуйте уменьшить силу лор, особенно, если вы используете несколько одновременно.',
        virtual_vram:
            'Виртуальная VRAM позволяет выгружать слои модели в обычную память и загружать заранее, по мере необходимости. Скорость остаётся практически неизменной, но при этом появляется возможность создавать более длинные видео более высокого разрешеия. Работает только с GGUF.',
        riflex: 'RIFLEx позволяет создавать длинные видео (>5 секунд) без зацикливания. Если вам нужно зацикленное видео, задайте длину 201 кадр и выключите RIFLEx.',
        upscale:
            'Также сохранить результат как анимированный WEBP без потери качества, позволяет отправлять видео во вкладку Upscale для дальнейших улучшений.',
    },
    toasts: {
        disconnected: 'Отключен',
        connected: 'Подключен!',
        error_getting_config: 'Ошибка получения конфига: %{err}',
        error_obj_info: 'Ошибка получения ифнормации об объектах: %{err}',
        objects_updated: 'Объекты обновлены',
        execution_skipped: 'Выполнение пропущено',
        error_processing_handler:
            'Ошибка выполнения обработчика %{name}: %{err}',
        reloaded_objects: 'Объекты перезагружены',
        no_prev_result: 'Предыдущий результат не найден',
        no_base: 'Не выбран базовый результат для сравнения',
        no_params: 'Параметры генерации не сохранены',
        params_restored: 'Параметры генерации восстановлены',
        error_saving_history: 'Ошибка сохранения истории: %{err}',
        error_importing_database: 'Ошибка при импорте истории: %{err}',
        error_exporting_database: 'Ошибка при экспорте истории: %{err}',
        error_uploading: 'Ошибка при загрузке изображения: %{err}',
    },
    status: {
        [statusEnum.WAITING]: 'Ожидание...',
        [statusEnum.RUNNING]: 'В процессе',
        [statusEnum.FINISHED]: 'Завершено',
        [statusEnum.ERROR]: 'Ошибка',
        [statusEnum.INTERRUPTED]: 'Прервано',
        [statusEnum.CANCELLED]: 'Отменено',
    },
    errors: {
        missing_controls: 'Отсутствующие контролы (есть в API): %{list}',
        missing_bindings:
            'Отсутствующие привязки к API (есть контролы): %{list}',
        missing_ids: 'Отсутствующие id узлов в API: %{list}',
        missing_fields: 'Отсутствующие поля в API: %{list}',
        interrupted: 'прервано',
    },
};

export default translation;
