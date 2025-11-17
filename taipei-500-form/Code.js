const FORM_TITLE = '台北 500 盤評選問卷';
const FORM_DESCRIPTION = '協助蒐集 2024 年台北 500 盤評選的提名資料，請留下完整餐廳與料理資訊。';
const FORM_PROPERTY_KEY = 'TAIPEI_500_FORM_ID';

/**
 * Entry point for clasp deploy testing – rebuilds the form and logs the edit URL.
 */
function deployTaipei500Form() {
  const form = buildTaipei500Form();
  Logger.log('表單已同步，編輯連結：%s', form.getEditUrl());
}

/**
 * Main builder that guarantees the target form exists and all questions are up to date.
 * Re-running the builder keeps the question order deterministic for CI-driven deploys.
 */
function buildTaipei500Form() {
  const form = getOrCreateForm();
  form.setTitle(FORM_TITLE);
  form.setDescription(FORM_DESCRIPTION);
  form.setCollectEmail(true);
  form.deleteAllItems();

  addRespondentSection(form);
  addNominationSection(form);
  addExperienceSection(form);
  addMediaSection(form);

  return form;
}

function getOrCreateForm() {
  const props = PropertiesService.getScriptProperties();
  const formId = props.getProperty(FORM_PROPERTY_KEY);
  if (formId) {
    try {
      return FormApp.openById(formId);
    } catch (err) {
      Logger.log('無法以既有 ID 開啟表單：%s，將建立新表單。', err);
    }
  }
  const newForm = FormApp.create(FORM_TITLE);
  props.setProperty(FORM_PROPERTY_KEY, newForm.getId());
  return newForm;
}

function addRespondentSection(form) {
  form.addSectionHeaderItem().setTitle('提名人資訊');

  form
    .addTextItem()
    .setTitle('提名人姓名 *')
    .setRequired(true)
    .setHelpText('請輸入中文姓名，方便評選團隊聯繫。');

  form
    .addTextItem()
    .setTitle('聯絡電話 / LINE ID *')
    .setRequired(true)
    .setHelpText('任一可聯絡方式，確保必要時能取得補充資訊。');

  form
    .addMultipleChoiceItem()
    .setTitle('參與身份 *')
    .setChoiceValues(['專業餐飲從業者', '媒體 / 自媒體', '一般用餐顧客', '其他'])
    .showOtherOption(true)
    .setRequired(true);
}

function addNominationSection(form) {
  form.addSectionHeaderItem().setTitle('餐廳與料理提名');

  form
    .addTextItem()
    .setTitle('餐廳名稱 *')
    .setRequired(true)
    .setHelpText('若為快閃 / 期間限定，也請註明時間。');

  form
    .addTextItem()
    .setTitle('行政主廚 / 料理負責人')
    .setRequired(false);

  form
    .addListItem()
    .setTitle('餐廳所在行政區 *')
    .setChoiceValues([
      '中正區',
      '大同區',
      '中山區',
      '松山區',
      '大安區',
      '萬華區',
      '信義區',
      '士林區',
      '北投區',
      '內湖區',
      '南港區',
      '文山區',
      '新北 / 桃園 / 其他'
    ])
    .setRequired(true);

  form
    .addTextItem()
    .setTitle('必吃料理名稱 *')
    .setRequired(true)
    .setHelpText('請填寫料理名稱，必要時可附上口味描述。');

  form
    .addParagraphTextItem()
    .setTitle('推薦理由 *')
    .setRequired(true)
    .setHelpText('分享料理精神、體驗亮點，或是與台北飲食文化的連結。');

  form
    .addScaleItem()
    .setTitle('整體體驗評分 *')
    .setBounds(1, 5)
    .setLabels('需要改善', '必吃體驗')
    .setRequired(true);
}

function addExperienceSection(form) {
  form.addSectionHeaderItem().setTitle('用餐經驗與背景');

  form
    .addCheckboxItem()
    .setTitle('本次提名期間內是否造訪超過一次？')
    .setChoiceValues(['是，造訪超過一次', '否，但近期有造訪', '尚未造訪（資訊分享）'])
    .showOtherOption(true);

  form
    .addParagraphTextItem()
    .setTitle('其他用餐心得 / 建議')
    .setRequired(false);

  form
    .addMultipleChoiceItem()
    .setTitle('是否願意接受專訪或拍攝？')
    .setChoiceValues(['可以', '暫時不便'])
    .setRequired(true);
}

function addMediaSection(form) {
  form.addSectionHeaderItem().setTitle('補充資料');

  form
    .addTextItem()
    .setTitle('照片 / 影音連結')
    .setHelpText('可提供雲端硬碟、IG 貼文或任何可公開使用的素材連結。');

  form
    .addFileUploadItem()
    .setTitle('上傳佐證資料')
    .setHelpText('可選擇上傳餐廳菜單、採訪筆記等。')
    .setMaxFiles(5)
    .setMaxFileSize(10);

  form
    .addParagraphTextItem()
    .setTitle('給評選團隊的悄悄話')
    .setHelpText('不會對外公開，僅供評選內部參考。');
}

/**
 * 手動重置儲存在 Script Properties 中的 Form ID，以便重新建立表單。
 */
function resetTaipei500FormId() {
  PropertiesService.getScriptProperties().deleteProperty(FORM_PROPERTY_KEY);
}
