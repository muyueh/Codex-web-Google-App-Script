/**
 * Creates a Google Form that showcases fifteen distinct question or layout types.
 *
 * The template covers short answers, paragraph text, single and multi-select
 * questions, grids, scheduling prompts, rating scales, and page/section breaks.
 * Every definition can be overridden through the `overrides.items` map.
 *
 * @param {Object} [overrides] - Optional overrides for the default form text.
 * @param {string} [overrides.title] - Form title.
 * @param {string} [overrides.description] - Form description.
 * @param {string} [overrides.confirmationMessage] - Confirmation message.
 * @param {boolean} [overrides.collectEmail] - Whether to collect email addresses.
 * @param {boolean} [overrides.allowResponseEdits] - Whether to allow edits.
 * @param {boolean} [overrides.progressBar] - Whether to show the progress bar.
 * @param {boolean} [overrides.shuffleQuestions] - Whether to shuffle questions.
 * @param {boolean} [overrides.limitOneResponsePerUser] - Enforce one response per user.
 * @param {Object<string, Object>} [overrides.items] - Item-level overrides keyed by type.
 * @returns {{id: string, editUrl: string, publishedUrl: string}}
 */
function createFifteenTypeForm(overrides) {
  var defaults = {
    title: '十五種題型綜合問卷',
    description: '此問卷一次示範 15 種不同題型，方便快速建立複雜的 Google 表單。',
    confirmationMessage: '感謝填寫，我們會盡快與您聯繫。',
    collectEmail: true,
    allowResponseEdits: false,
    progressBar: true,
    shuffleQuestions: false,
    limitOneResponsePerUser: false,
    items: getDefaultItemDefinitions()
  };

  var userOverrides = overrides || {};
  var config = Object.assign({}, defaults, userOverrides);
  var resolvedItems = mergeItemDefinitions(defaults.items, userOverrides.items || {});

  var form = FormApp.create(config.title)
    .setDescription(config.description)
    .setCollectEmail(Boolean(config.collectEmail))
    .setAllowResponseEdits(Boolean(config.allowResponseEdits))
    .setProgressBar(Boolean(config.progressBar))
    .setShuffleQuestions(Boolean(config.shuffleQuestions));

  if (config.limitOneResponsePerUser) {
    form.setLimitOneResponsePerUser(true);
  }

  if (config.confirmationMessage) {
    form.setConfirmationMessage(config.confirmationMessage);
  }

  buildFifteenItemSet(form, resolvedItems);

  var metadata = {
    id: form.getId(),
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl()
  };

  Logger.log('已建立 15 種題型的表單');
  Logger.log(JSON.stringify(metadata, null, 2));

  return metadata;
}

/**
 * Ensures the overrides map keeps all fifteen item definitions while
 * letting callers override titles, help texts, and other properties.
 *
 * @param {Object<string, Object>} defaults - Default item definitions.
 * @param {Object<string, Object>} overrides - User supplied item overrides.
 * @returns {Object<string, Object>}
 */
function mergeItemDefinitions(defaults, overrides) {
  var merged = {};

  Object.keys(defaults).forEach(function(key) {
    merged[key] = Object.assign({}, defaults[key], overrides[key]);
  });

  Object.keys(overrides).forEach(function(key) {
    if (!merged[key]) {
      merged[key] = Object.assign({}, overrides[key]);
    }
  });

  return merged;
}

/**
 * Iterates through the fifteen required item builders and appends them to the form.
 *
 * @param {Form} form - Target Google Form instance.
 * @param {Object<string, Object>} items - Item definitions keyed by type.
 */
function buildFifteenItemSet(form, items) {
  Object.keys(FIFTEEN_ITEM_BUILDERS).forEach(function(key) {
    var definition = items[key];
    if (!definition) {
      throw new Error('缺少 "' + key + '" 題型的設定，請提供 overrides.items.' + key);
    }

    FIFTEEN_ITEM_BUILDERS[key](form, definition);
  });
}

/**
 * Applies shared helpers (help text & required flag) to the majority of items.
 *
 * @param {FormItem} item - The item to update.
 * @param {Object} definition - Helper metadata per item.
 */
function applyCommonItemSettings(item, definition) {
  if (definition.helpText && typeof item.setHelpText === 'function') {
    item.setHelpText(definition.helpText);
  }

  var required = definition.required;
  if (typeof required === 'undefined') {
    required = true;
  }

  if (typeof item.setRequired === 'function') {
    item.setRequired(Boolean(required));
  }
}

/**
 * Default item definitions for all fifteen entries.
 *
 * @returns {Object<string, Object>}
 */
function getDefaultItemDefinitions() {
  return {
    shortAnswer: {
      title: '基本資料：姓名',
      helpText: '請輸入您的全名（必填）'
    },
    paragraph: {
      title: '自我介紹',
      helpText: '200 字內描述您目前的職務與專長'
    },
    multipleChoice: {
      title: '偏好的合作方式',
      choices: ['顧問專案', '短期工作坊', '長期顧問', '單次諮詢'],
      showOtherOption: true
    },
    checkbox: {
      title: '希望我們提供哪些內容？',
      choices: ['白皮書', '實作課程', '診斷報告', '內部訓練'],
      helpText: '可複選，若沒有符合請填其他',
      allowOtherOption: true
    },
    dropdown: {
      title: '公司規模',
      choices: ['1-10 人', '11-50 人', '51-200 人', '201 人以上']
    },
    linearScale: {
      title: '目前專案信心指數',
      lowerBound: 1,
      upperBound: 10,
      lowerLabel: '需要大量支援',
      upperLabel: '非常有信心'
    },
    grid: {
      title: '團隊能力評估（單選）',
      rows: ['研發', '銷售', '行銷', '營運'],
      columns: ['不足', '普通', '良好', '卓越']
    },
    checkboxGrid: {
      title: '可配合的會議時段（複選）',
      rows: ['週一', '週三', '週五'],
      columns: ['上午', '下午', '晚上']
    },
    date: {
      title: '期望啟動日期'
    },
    dateTime: {
      title: '第一次會議時間'
    },
    time: {
      title: '每日最佳聯絡時段',
      helpText: '例如 14:30'
    },
    duration: {
      title: '理想課程長度',
      helpText: '輸入預計的總時數'
    },
    rating: {
      title: '整體滿意度預測',
      ratingScaleLevel: 5,
      ratingIcon: 'STAR'
    },
    sectionHeader: {
      title: '深入問題',
      helpText: '以下題目會針對細節展開'
    },
    pageBreak: {
      title: '送出前檢查',
      helpText: '確認所有欄位是否完整'
    }
  };
}

var FIFTEEN_ITEM_BUILDERS = {
  shortAnswer: function(form, definition) {
    var item = form.addTextItem().setTitle(definition.title);
    applyCommonItemSettings(item, definition);
  },
  paragraph: function(form, definition) {
    var item = form.addParagraphTextItem().setTitle(definition.title);
    applyCommonItemSettings(item, definition);
  },
  multipleChoice: function(form, definition) {
    var item = form.addMultipleChoiceItem().setTitle(definition.title);
    if (definition.choices) {
      item.setChoiceValues(definition.choices);
    }
    if (definition.showOtherOption) {
      item.showOtherOption(true);
    }
    applyCommonItemSettings(item, definition);
  },
  checkbox: function(form, definition) {
    var item = form.addCheckboxItem().setTitle(definition.title);
    if (definition.choices) {
      item.setChoiceValues(definition.choices);
    }
    if (definition.allowOtherOption) {
      item.showOtherOption(true);
    }
    applyCommonItemSettings(item, definition);
  },
  dropdown: function(form, definition) {
    var item = form.addListItem().setTitle(definition.title);
    if (definition.choices) {
      item.setChoiceValues(definition.choices);
    }
    applyCommonItemSettings(item, definition);
  },
  linearScale: function(form, definition) {
    var item = form.addScaleItem().setTitle(definition.title);
    var lower = Number(definition.lowerBound || 1);
    var upper = Number(definition.upperBound || 5);
    if (upper <= lower) {
      throw new Error('linearScale.upperBound 必須大於 lowerBound');
    }
    item.setBounds(lower, upper);
    if (definition.lowerLabel || definition.upperLabel) {
      item.setLabels(definition.lowerLabel || '', definition.upperLabel || '');
    }
    applyCommonItemSettings(item, definition);
  },
  grid: function(form, definition) {
    var item = form.addGridItem().setTitle(definition.title);
    if (definition.rows) {
      item.setRows(definition.rows);
    }
    if (definition.columns) {
      item.setColumns(definition.columns);
    }
    applyCommonItemSettings(item, definition);
  },
  checkboxGrid: function(form, definition) {
    var item = form.addCheckboxGridItem().setTitle(definition.title);
    if (definition.rows) {
      item.setRows(definition.rows);
    }
    if (definition.columns) {
      item.setColumns(definition.columns);
    }
    applyCommonItemSettings(item, definition);
  },
  date: function(form, definition) {
    var item = form.addDateItem().setTitle(definition.title);
    applyCommonItemSettings(item, definition);
  },
  dateTime: function(form, definition) {
    var item = form.addDateTimeItem().setTitle(definition.title);
    applyCommonItemSettings(item, definition);
  },
  time: function(form, definition) {
    var item = form.addTimeItem().setTitle(definition.title);
    applyCommonItemSettings(item, definition);
  },
  duration: function(form, definition) {
    var item = form.addDurationItem().setTitle(definition.title);
    applyCommonItemSettings(item, definition);
  },
  rating: function(form, definition) {
    var item = form.addRatingItem().setTitle(definition.title);
    if (definition.ratingScaleLevel) {
      item.setRatingScaleLevel(definition.ratingScaleLevel);
    }
    var icon = definition.ratingIcon;
    if (icon && FormApp.RatingIconType && FormApp.RatingIconType[icon]) {
      item.setRatingIcon(FormApp.RatingIconType[icon]);
    }
    applyCommonItemSettings(item, definition);
  },
  sectionHeader: function(form, definition) {
    var item = form.addSectionHeaderItem().setTitle(definition.title);
    if (definition.helpText) {
      item.setHelpText(definition.helpText);
    }
  },
  pageBreak: function(form, definition) {
    var item = form.addPageBreakItem().setTitle(definition.title);
    if (definition.helpText) {
      item.setHelpText(definition.helpText);
    }
  }
};
