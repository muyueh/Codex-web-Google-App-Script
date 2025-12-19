/******************************************************************************************
 *  OpenAI for Google Sheets — unified text, web‑search, image, vision *and* speech helpers
 *  (v3‑2025‑07‑30 rev‑E)          ← ★ NEW REVISION  –  parallel
 *
 *  ✨  CHANGES IN THIS REVISION (E)
 *  -------------------------------------------------------------------------
 *  • ** parallel**
 ******************************************************************************************/

// ────────────────────────────────
// 1.  GLOBAL CONSTANTS & KEY STORAGE
// ────────────────────────────────
const PROP_OPENAI_KEY = 'OPENAI_API_KEY';          // stored in Script Properties
const TEMPERATURE     = 1;
const MAX_TOKENS      = 4000;
const MODEL           = 'gpt-5.2';                 // default text model (Responses API)

const DEFAULT_VISION_PROMPT     = '請簡要描述此圖片。';

const DEFAULT_SPEECH_MODEL      = 'tts-1-hd';
const DEFAULT_VOICE             = 'alloy';
const DEFAULT_SPEECH_FMT        = 'mp3';
const DEFAULT_SPEECH_INSTRUCTIONS = 'Speak in a cheerful and positive tone.';
const PARALLEL_BATCH_SIZE = 50;   // 固定並行上限；勿高於 50

const MENU_ROOT       = 'OpenAI';

let   CACHE_API_KEY;                               // runtime‑only memory cache

/** Retrieve the saved OpenAI API‑Key (lazy prompt, cached for this execution). */
function getApiKey_() {
  if (CACHE_API_KEY) return CACHE_API_KEY;                           // ① memory cache

  const props = PropertiesService.getScriptProperties();
  let key     = (props.getProperty(PROP_OPENAI_KEY) || '').trim();
  if (key) return (CACHE_API_KEY = key);                             // ② property exists

  // ③ prompt only when property is missing
  const ui  = SpreadsheetApp.getUi();
  const res = ui.prompt(
    '設定 OpenAI API 金鑰',
    '請貼上您的 OpenAI API Key（僅儲存於此 Apps Script）：',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) {
    throw new Error('需要先設定 API Key 才能使用此功能。');
  }
  key = (res.getResponseText() || '').trim();
  if (!key) throw new Error('API Key 不可為空白！');

  props.setProperty(PROP_OPENAI_KEY, key);
  ui.alert('✅ API Key 已成功儲存，未來將自動載入。');
  return (CACHE_API_KEY = key);
}

// ────────────────────────────────
// 2.  SHARED HELPERS
// ────────────────────────────────
/** Extract *first* assistant text from a /v1/responses body. */
function extractRespText(body) {
  for (const item of body.output || []) {
    if (item.type !== 'message') continue;
    const txtObj = (item.content || []).find(c => c.type === 'output_text');
    if (txtObj && txtObj.text) return txtObj.text.trim();
  }
  return '';
}
/** Extract URL citations (web_search tool) from a /v1/responses body. */
function extractWebSearchCitations(body) {
  const msg = (body.output || []).find(o => o.type === 'message');
  return (msg?.annotations || [])
           .filter(a => a.type === 'url_citation')
           .map(a => a.url);
}
/** Resolve Excel‑style concatenation in custom‑function formulas. */
function resolveConcat(argStr) {
  return argStr.split('&').reduce((acc, piece) => {
    piece = piece.trim();
    return acc + (/^[A-Z]+\d+$/i.test(piece)
      ? SpreadsheetApp.getActiveSpreadsheet().getRange(piece).getValue()
      : piece.replace(/"/g, ''));
  }, '');
}

// ────────────────────────────────
// 3.  TEXT ‑ Chat / latest Responses API (gpt‑5.2 default)
// ────────────────────────────────
function ChatGPT(prompt,
                 temperature = TEMPERATURE,
                 max_tokens  = MAX_TOKENS,
                 model       = MODEL) {
  const payload = {
    model,
    input: [{
      role   : 'user',
      content: [{ type: 'input_text', text: prompt }]
    }],
    temperature,
    max_output_tokens: max_tokens,
    text             : { format: { type: 'text' } }
  };

  const options = {
    method            : 'post',
    contentType       : 'application/json',
    headers           : { Authorization: 'Bearer ' + getApiKey_() },
    muteHttpExceptions: true,
    payload           : JSON.stringify(payload)
  };

  const res  = UrlFetchApp.fetch('https://api.openai.com/v1/responses', options);
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText());
  if (code < 200 || code > 299) {
    throw new Error(`OpenAI API error (${code}): ${body.error?.message || res.getContentText()}`);
  }
  return extractRespText(body);
}

// ────────────────────────────────
// 4.  WEB SEARCH  (Responses API + tool)
// ────────────────────────────────
function WebSearch(query,
                   contextSize = 'high',
                   temperature = TEMPERATURE,
                   max_tokens  = MAX_TOKENS,
                   model       = MODEL) {
  const payload = {
    model,
    input: [{
      role   : 'user',
      content: [{ type: 'input_text', text: query }]
    }],
    temperature,
    max_output_tokens: max_tokens,
    text             : { format: { type: 'text' } },
    tools: [{
      type               : 'web_search_preview',
      search_context_size: contextSize,
      user_location      : { type: 'approximate', country: 'TW' }
    }]
  };

  const options = {
    method            : 'post',
    contentType       : 'application/json',
    headers           : { Authorization: 'Bearer ' + getApiKey_() },
    muteHttpExceptions: true,
    payload           : JSON.stringify(payload)
  };

  const res  = UrlFetchApp.fetch('https://api.openai.com/v1/responses', options);
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText());
  if (code < 200 || code > 299) {
    throw new Error(`OpenAI API error (${code}): ${body.error?.message || res.getContentText()}`);
  }
  return {
    text : extractRespText(body),
    cites: extractWebSearchCitations(body)
  };
}

// ────────────────────────────────
// 5.  IMAGE GENERATION (gpt‑image‑1) — unchanged
// ────────────────────────────────
function GPT_IMAGE(prompt, size = '1024x1024', quality = 'high') {
  const payload = {
    model        : 'gpt-image-1',
    prompt,
    size,
    quality      : quality.toLowerCase() === 'hd' ? 'high' : quality,
    moderation   : 'low',
    output_format: 'png',
    n            : 1
  };
  const options = {
    contentType       : 'application/json',
    headers           : { Authorization: 'Bearer ' + getApiKey_() },
    payload           : JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const res  = UrlFetchApp.fetch('https://api.openai.com/v1/images/generations', options);
  const code = res.getResponseCode();
  if (code !== 200) throw new Error(res.getContentText());
  return JSON.parse(res.getContentText()).data; // [{ b64_json, revised_prompt }]
}

function getOrCreateSheetFolder() {
  const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const parent = ssFile.getParents().hasNext() ? ssFile.getParents().next()
                                               : DriveApp.getRootFolder();
  const name   = 'gpt-image-1 images';
  const exists = parent.getFoldersByName(name);
  return exists.hasNext() ? exists.next() : parent.createFolder(name);
}

/** Get or create the dedicated folder for speech files. */
function getOrCreateSpeechFolder() {
  const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const parent = ssFile.getParents().hasNext() ? ssFile.getParents().next()
                                               : DriveApp.getRootFolder();
  const name   = 'gpt-speech audio';
  const exists = parent.getFoldersByName(name);
  return exists.hasNext() ? exists.next() : parent.createFolder(name);
}

// ────────────────────────────────
// 6.  VISION (GPT‑4o multimodal)  – via Responses API
// ────────────────────────────────
function OpenAIVision(imageUrl,
                      prompt      = DEFAULT_VISION_PROMPT,
                      max_tokens  = 300,
                      model       = 'gpt-4o',
                      temperature = 0) {
  if (!imageUrl) throw new Error('需要提供圖片網址 (imageUrl)。');

  const payload = {
    model,
    input: [{
      role   : 'user',
      content: [
        { type: 'input_text',  text: prompt },
        { type: 'input_image', image_url: imageUrl }
      ]
    }],
    temperature,
    max_output_tokens: max_tokens,
    text: { format: { type: 'text' } }
  };

  const options = {
    method            : 'post',
    contentType       : 'application/json',
    headers           : { Authorization: 'Bearer ' + getApiKey_() },
    muteHttpExceptions: true,
    payload           : JSON.stringify(payload)
  };

  const res  = UrlFetchApp.fetch('https://api.openai.com/v1/responses', options);
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText());
  if (code !== 200) throw new Error(`HTTP ${code}: ${res.getContentText()}`);
  return extractRespText(body);
}

// ────────────────────────────────
// 7.  SPEECH (TTS) — unchanged
// ────────────────────────────────
function OpenAITTS(text,
                   voice          = DEFAULT_VOICE,
                   model          = DEFAULT_SPEECH_MODEL,
                   instructions   = DEFAULT_SPEECH_INSTRUCTIONS,
                   responseFormat = DEFAULT_SPEECH_FMT,
                   filename       = '') {
  if (!text) throw new Error('Text 不可為空白！');

  const payload = { model, input: text, voice, response_format: responseFormat };
  const instrTrim = (instructions || '').trim();
  if (instrTrim && !/^tts-1(-hd)?$/i.test(model)) payload.instructions = instrTrim;

  const options = {
    method            : 'post',
    contentType       : 'application/json',
    headers           : { Authorization: 'Bearer ' + getApiKey_() },
    muteHttpExceptions: true,
    payload           : JSON.stringify(payload)
  };

  const res  = UrlFetchApp.fetch('https://api.openai.com/v1/audio/speech', options);
  const code = res.getResponseCode();
  if (code !== 200) throw new Error(`OpenAI TTS error (${code}): ${res.getContentText()}`);

  const blob = res.getBlob();
  const ext  = responseFormat.toLowerCase();
  const name = (filename || `gptSpeech_${Date.now()}.${ext}`)
                 .replace(/\s+/g, '_')
                 .replace(/\.[^.]+$/, '') + `.${ext}`;
  blob.setName(name);

  const folder = getOrCreateSpeechFolder();
  const file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return `https://drive.google.com/uc?export=download&id=${file.getId()}`;
}

// ────────────────────────────────
// 8.  CUSTOM FUNCTIONS (public‑facing)
// ────────────────────────────────
/**
 * Calls the OpenAI “Responses” API to generate text.
 *
 * @param {string} promptRef            Prompt string or cell reference.
 * @param {number} [temperature=1]      Sampling temperature (0–2).
 * @param {number} [max_tokens=4000]    Max tokens to return.
 * @param {string} [model="gpt-5.2"]    Model name (e.g. "gpt‑4o").
 * @param {string} [outputDirection]    "right" (default) or "below".
 * @param {boolean} [parallel=false]    If TRUE, queue this call for the
 *                                      parallel batch runner.
 * @return {string}                     The assistant’s reply.
 * @customfunction
 */

function gpt_text(promptRef,
                  temperature = TEMPERATURE,
                  max_tokens  = MAX_TOKENS,
                  model       = MODEL,
                  outputDirection = 'right',
                  parallel = false) {
  return 'Ready for Run OpenAI';
}

/**
 * Performs a web‑augmented search via OpenAI.
 *
 * @param {string} queryRef                 Query string or cell reference.
 * @param {string} [contextSize="high"]     Search context size ("low"|"high").
 * @param {number} [temperature=1]          Sampling temperature.
 * @param {number} [max_tokens=4000]        Max tokens to return.
 * @param {string} [model="gpt-5.2"]        Model name.
 * @param {boolean} [parallel=false]        Queue for parallel execution.
 * @return {string}                         Answer text. Citations go in the
 *                                          next cell to the right.
 * @customfunction
 */
function gpt_search(queryRef,
                    contextSize = 'high',
                    temperature = TEMPERATURE,
                    max_tokens  = MAX_TOKENS,
                    model       = MODEL,
                    parallel = false) {
  return 'Ready for Run OpenAI';
}

/**
 * Generate an image via OpenAI (gpt‑image‑1).
 *
 * @param {string} promptRef           The prompt describing the image.
 * @param {string} [size="1024x1024"] Image size (e.g. "512x512").
 * @param {string} [quality="high"]   "low" | "standard" | "high".
 * @return {string} Placeholder — shows "Ready for Run OpenAI".
 * @customfunction
 */
function gpt_image(promptRef,
                   size = '1024x1024',
                   quality = 'high') {
  return 'Ready for Run OpenAI';
}
/**
 * Call GPT‑4o vision on an image URL.
 *
 * @param {string} imageUrlRef              Image URL (may reference cell).
 * @param {string} [promptRef="請簡要描述此圖片。"]  Vision prompt.
 * @param {number} [max_tokens=300]         Maximum tokens.
 * @param {string} [model="gpt-4o"]        Model name.
 * @param {string} [outputDirection="right"] "right" (default) or "below" — where to place the answer.
 * @return {string} Placeholder — shows "Ready for Run OpenAI".
 * @customfunction
 */
function gpt_vision(imageUrlRef,
                    promptRef      = `"${DEFAULT_VISION_PROMPT}"`,
                    max_tokens     = 300,
                    model          = 'gpt-4o',
                    outputDirection = 'right') {
  return 'Ready for Run OpenAI';
}
/**
 * Generate speech (audio file) from text using OpenAI TTS.
 *
 * @param {string} textRef                         Text to convert (may reference cell).
 * @param {string} [voice="alloy"]                 Voice name.
 * @param {string} [model="tts-1-hd"]              TTS model.
 * @param {string} [instructions="Speak in a cheerful and positive tone."]  Additional instructions.
 * @param {string} [responseFormat="mp3"]          Audio format (mp3, wav, …).
 * @param {string} [filename=""]                   Optional filename (without path).
 * @param {string} [outputDirection="right"]       "right" (default) or "below".
 * @return {string} Placeholder — shows "Ready for Run OpenAI".
 * @customfunction
 */
function gpt_speech(textRef,
                    voice          = `"${DEFAULT_VOICE}"`,
                    model          = `"${DEFAULT_SPEECH_MODEL}"`,
                    instructions   = `"${DEFAULT_SPEECH_INSTRUCTIONS}"`,
                    responseFormat = `"${DEFAULT_SPEECH_FMT}"`,
                    filename       = '""',
                    outputDirection = 'right') {
  return 'Ready for Run OpenAI';
}

// ────────────────────────────────
// 9.  UNIVERSAL RUNNER — “Run OpenAI”
// ────────────────────────────────
function runOpenAI() {
  getApiKey_();  // ensure key present

  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  const rows  = range.getNumRows();
  const cols  = range.getNumColumns();

  /* 佇列收集 */
  const textTasks   = [];
  const searchTasks = [];
  let totalParallel = 0;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const cell    = range.getCell(r, c);
      const formula = cell.getFormula() || '';

      /* ---------- GPT_TEXT ---------- */
      if (formula.includes('gpt_text(')) {
        try {
          const argStr = formula.split('gpt_text(')[1].split(')')[0];
          const [promptRaw, tempRaw = TEMPERATURE, tokensRaw = MAX_TOKENS,
                 modelRaw = `"${MODEL}"`, dirRaw = '"right"',
                 parallelRaw = 'false'] = argStr.split(/\s*,\s*/);

          const prompt      = resolveConcat(promptRaw);
          const temperature = parseFloat(tempRaw);
          const max_tokens  = parseInt(tokensRaw, 10);
          const model       = modelRaw.replace(/"/g, '');
          const direction   = dirRaw.replace(/"/g, '').toLowerCase();
          const isParallel  = /true|1|parallel/i.test(parallelRaw.replace(/"/g, ''));

          const outCell = direction === 'below'
            ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
            : sheet.getRange(cell.getRow(),     cell.getColumn() + 1);

          if (isParallel) {
            textTasks.push({ prompt, temperature, max_tokens, model, outCell });
            totalParallel++;
          } else {
            const answer = ChatGPT(prompt, temperature, max_tokens, model);
            outCell.setValue(answer);
          }
        } catch (err) {
          SpreadsheetApp.getUi().alert('ChatGPT error: ' + err.message);
        }
        continue;
      }

      /* ---------- GPT_SEARCH ---------- */
      if (formula.includes('gpt_search(')) {
        try {
          const argStr = formula.split('gpt_search(')[1].split(')')[0];
          const [queryRaw, ctxtRaw = '"high"', tempRaw = TEMPERATURE,
                 tokensRaw = MAX_TOKENS, modelRaw = `"${MODEL}"`,
                 parallelRaw = 'false'] = argStr.split(/\s*,\s*/);

          const query       = resolveConcat(queryRaw);
          const contextSize = ctxtRaw.replace(/"/g, '') || 'high';
          const temperature = parseFloat(tempRaw);
          const max_tokens  = parseInt(tokensRaw, 10);
          const model       = modelRaw.replace(/"/g, '');
          const isParallel  = /true|1|parallel/i.test(parallelRaw.replace(/"/g, ''));

          const answerCell = sheet.getRange(cell.getRow(), cell.getColumn() + 1);
          const citeCell   = sheet.getRange(cell.getRow(), cell.getColumn() + 2);

          if (isParallel) {
            searchTasks.push({ query, contextSize, temperature, max_tokens, model, answerCell, citeCell });
            totalParallel++;
          } else {
            const { text: answer, cites } = WebSearch(query, contextSize, temperature, max_tokens, model);
            answerCell.setValue(answer);
            citeCell.setValue(cites.join(', '));
          }
        } catch (err) {
          SpreadsheetApp.getUi().alert('Web Search error: ' + err.message);
        }
        continue;
      }

      /* ---------- GPT_IMAGE ---------- */
      if (formula.includes('gpt_image(')) {
        try {
          const argStr = formula.split('gpt_image(')[1].split(')')[0];
          const [promptRaw, sizeRaw = '"1024x1024"', qualRaw = '"high"'] = argStr.split(/\s*,\s*/);
          const prompt  = resolveConcat(promptRaw);
          const size    = sizeRaw.replace(/"/g, '');
          const quality = qualRaw.replace(/"/g, '');
          const imgData = GPT_IMAGE(prompt, size, quality)[0];
          const folder  = getOrCreateSheetFolder();
          const name    = `gptImage_${Date.now()}.png`;
          const bytes   = Utilities.base64Decode(imgData.b64_json);
          const blob    = Utilities.newBlob(bytes, 'image/png', name);
          const file    = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          const url     = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
          sheet.getRange(cell.getRow(), cell.getColumn() + 1).setValue(url);
          sheet.getRange(cell.getRow(), cell.getColumn() + 2).setValue(prompt);
        } catch (err) {
          SpreadsheetApp.getUi().alert('Image generation error: ' + err.message);
        }
        continue;
      }

      /* ---------- GPT_VISION ---------- */
      if (formula.includes('gpt_vision(')) {
        try {
          const argStr = formula.split('gpt_vision(')[1].split(')')[0];
          const [urlRaw, promptRaw = `"${DEFAULT_VISION_PROMPT}"`,
                 tokensRaw = 300, modelRaw = '"gpt-4o"', dirRaw = '"right"'] = argStr.split(/\s*,\s*/);
          const imageUrl   = resolveConcat(urlRaw);
          const prompt     = resolveConcat(promptRaw) || DEFAULT_VISION_PROMPT;
          const max_tokens = parseInt(tokensRaw, 10);
          const model      = modelRaw.replace(/"/g, '');
          const direction  = dirRaw.replace(/"/g, '').toLowerCase();

          const answer = OpenAIVision(imageUrl, prompt, max_tokens, model);

          const outCell = direction === 'below'
            ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
            : sheet.getRange(cell.getRow(),     cell.getColumn() + 1);
          outCell.setValue(answer);
        } catch (err) {
          SpreadsheetApp.getUi().alert('Vision error: ' + err.message);
        }
        continue;
      }

      /* ---------- GPT_SPEECH ---------- */
      if (formula.includes('gpt_speech(')) {
        try {
          const argStr = formula.split('gpt_speech(')[1].split(')')[0];
          const [textRaw, voiceRaw = `"${DEFAULT_VOICE}"`,
                 modelRaw = `"${DEFAULT_SPEECH_MODEL}"`,
                 instrRaw = `"${DEFAULT_SPEECH_INSTRUCTIONS}"`,
                 fmtRaw   = `"${DEFAULT_SPEECH_FMT}"`,
                 fileRaw  = '""',
                 dirRaw   = '"right"'] = argStr.split(/\s*,\s*/);

          const text        = resolveConcat(textRaw);
          const voice       = voiceRaw.replace(/"/g, '') || DEFAULT_VOICE;
          const model       = modelRaw.replace(/"/g, '') || DEFAULT_SPEECH_MODEL;
          const instructions= resolveConcat(instrRaw) || DEFAULT_SPEECH_INSTRUCTIONS;
          const fmt         = fmtRaw.replace(/"/g, '') || DEFAULT_SPEECH_FMT;
          const filename    = resolveConcat(fileRaw).replace(/"/g, '');
          const direction   = dirRaw.replace(/"/g, '').toLowerCase();

          const url = OpenAITTS(text, voice, model, instructions, fmt, filename);

          const outCell = direction === 'below'
            ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
            : sheet.getRange(cell.getRow(),     cell.getColumn() + 1);
          outCell.setValue(url);
        } catch (err) {
          SpreadsheetApp.getUi().alert('Speech error: ' + err.message);
        }
      }
    }
  }

  /* ── 平行佇列分批送出 ── */
  let processed = 0;
  const total   = totalParallel;
  const ss      = SpreadsheetApp.getActiveSpreadsheet();

  for (let i = 0; i < textTasks.length; i += PARALLEL_BATCH_SIZE) {
    processed += processTextBatch(textTasks.slice(i, i + PARALLEL_BATCH_SIZE));
    ss.toast(`Processed ${processed}/${total} requests…`, 'OpenAI Batch', 5);
  }
  for (let i = 0; i < searchTasks.length; i += PARALLEL_BATCH_SIZE) {
    processed += processSearchBatch(searchTasks.slice(i, i + PARALLEL_BATCH_SIZE));
    ss.toast(`Processed ${processed}/${total} requests…`, 'OpenAI Batch', 5);
  }

  ss.toast('✅ All parallel batches finished!', 'OpenAI Batch', 5);
}


// ────────────────────────────────
// 10.  MENU & BOOTSTRAP
// ────────────────────────────────
function setup() {
  getApiKey_();  // prompt for key if missing
  onOpen();      // build menu
}
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(MENU_ROOT)
    .addItem('Run OpenAI', 'runOpenAI')
    .addToUi();
}

// ────────────────────────────────
// 11.  OPTIONAL QUICK TESTS
// ────────────────────────────────
function testRunOpenAI_Image() {
  const res = GPT_IMAGE('Sunset over a futuristic city in watercolor')[0];
  Logger.log('Bytes:', res.b64_json.length);
}
function testRunOpenAI_Search() {
  const { text, cites } = WebSearch('positive news story from today');
  Logger.log('Answer:', text);
  Logger.log('Cites :', cites.join(', '));
}
function testRunOpenAI_Vision() {
  const url = 'https://raw.githubusercontent.com/google/material-design-icons/master/src/social/mood/materialicons/24px.svg';
  const ans = OpenAIVision(url, '這是什麼圖示？');
  Logger.log('Vision:', ans);
}
function testRunOpenAI_Speech() {
  const url = OpenAITTS('這是一段測試語音，歡迎使用！');
  Logger.log('Speech URL:', url);
}



/* ────────────────────────────────────────────────
 * 11‑A.  平行批次處理工具
 * ────────────────────────────────────────────────*/
function processTextBatch(batch) {
  if (!batch.length) return 0;
  const requests = batch.map(t => ({
    url                : 'https://api.openai.com/v1/responses',
    method             : 'post',
    contentType        : 'application/json',
    headers            : { Authorization: 'Bearer ' + getApiKey_() },
    muteHttpExceptions : true,
    payload            : JSON.stringify({
      model             : t.model,
      input: [{
        role   : 'user',
        content: [{ type: 'input_text', text: t.prompt }]
      }],
      temperature       : t.temperature,
      max_output_tokens : t.max_tokens,
      text              : { format: { type: 'text' } }
    })
  }));
  const responses = UrlFetchApp.fetchAll(requests);
  let done = 0;
  responses.forEach((res, i) => {
    let answer = '';
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      answer = extractRespText(JSON.parse(res.getContentText()));
    } else {
      /* ——— 重試一次 (單筆順序) ——— */
      try {
        const retry = UrlFetchApp.fetch(requests[i].url, requests[i]);
        if (retry.getResponseCode() >= 200 && retry.getResponseCode() < 300) {
          answer = extractRespText(JSON.parse(retry.getContentText()));
        } else {
          answer = `ERROR ${retry.getResponseCode()}`;
        }
      } catch (e) {
        answer = 'ERROR';
      }
    }
    batch[i].outCell.setValue(answer);
    done++;
  });
  return done;
}

function processSearchBatch(batch) {
  if (!batch.length) return 0;
  const requests = batch.map(t => ({
    url                : 'https://api.openai.com/v1/responses',
    method             : 'post',
    contentType        : 'application/json',
    headers            : { Authorization: 'Bearer ' + getApiKey_() },
    muteHttpExceptions : true,
    payload            : JSON.stringify({
      model             : t.model,
      input: [{
        role   : 'user',
        content: [{ type: 'input_text', text: t.query }]
      }],
      temperature       : t.temperature,
      max_output_tokens : t.max_tokens,
      text              : { format: { type: 'text' } },
      tools             : [{
        type               : 'web_search_preview',
        search_context_size: t.contextSize,
        user_location      : { type: 'approximate', country: 'TW' }
      }]
    })
  }));
  const responses = UrlFetchApp.fetchAll(requests);
  let done = 0;
  responses.forEach((res, i) => {
    let answer = '', cites = [];
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      const body = JSON.parse(res.getContentText());
      answer = extractRespText(body);
      cites  = extractWebSearchCitations(body);
    } else {
      /* ——— 重試一次 (單筆順序) ——— */
      try {
        const retry = UrlFetchApp.fetch(requests[i].url, requests[i]);
        if (retry.getResponseCode() >= 200 && retry.getResponseCode() < 300) {
          const body = JSON.parse(retry.getContentText());
          answer = extractRespText(body);
          cites  = extractWebSearchCitations(body);
        } else {
          answer = `ERROR ${retry.getResponseCode()}`;
        }
      } catch (e) {
        answer = 'ERROR';
      }
    }
    batch[i].answerCell.setValue(answer);
    batch[i].citeCell.setValue((cites || []).join(', '));
    done++;
  });
  return done;
}
