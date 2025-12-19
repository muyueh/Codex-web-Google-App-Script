/// <reference types="google-apps-script" />

/******************************************************************************************
 * OpenAI for Google Sheets — custom functions and a menu runner for text, search,
 * image, vision, and speech workflows powered by the Responses API.
 ******************************************************************************************/

type ResponsesAnnotation = {
  type?: string;
  url?: string;
  [key: string]: unknown;
};

type ResponsesContent = {
  type?: string;
  text?: string;
  [key: string]: unknown;
};

type ResponsesMessage = {
  type?: string;
  content?: ResponsesContent[];
  annotations?: ResponsesAnnotation[];
};

type ResponsesBody = {
  output?: ResponsesMessage[];
  error?: { message?: string };
};

type TextTask = {
  prompt: string;
  temperature: number;
  max_tokens: number;
  model: string;
  outCell: GoogleAppsScript.Spreadsheet.Range;
};

type SearchTask = {
  query: string;
  contextSize: string;
  temperature: number;
  max_tokens: number;
  model: string;
  answerCell: GoogleAppsScript.Spreadsheet.Range;
  citeCell: GoogleAppsScript.Spreadsheet.Range;
};

// ────────────────────────────────
// 1.  GLOBAL CONSTANTS & KEY STORAGE
// ────────────────────────────────
const PROP_OPENAI_KEY = 'OPENAI_API_KEY'; // stored in Script Properties
const TEMPERATURE = 1;
const MAX_TOKENS = 4000;
const MODEL = 'gpt-5.2'; // default text model (Responses API)

const DEFAULT_VISION_PROMPT = '請簡要描述此圖片。';

const DEFAULT_SPEECH_MODEL = 'tts-1-hd';
const DEFAULT_VOICE = 'alloy';
const DEFAULT_SPEECH_FMT = 'mp3';
const DEFAULT_SPEECH_INSTRUCTIONS = 'Speak in a cheerful and positive tone.';
const PARALLEL_BATCH_SIZE = 50; // 固定並行上限；勿高於 50

const MENU_ROOT = 'OpenAI';

let CACHE_API_KEY: string | undefined; // runtime‑only memory cache

/**
 * Retrieve the saved OpenAI API key with a memory cache and lazy UI prompt.
 *
 * Uses {@link PropertiesService.getScriptProperties} to load the key, and
 * falls back to prompting the active spreadsheet UI when missing.
 *
 * @returns {string} API key text.
 */
function getApiKey_(): string {
  if (CACHE_API_KEY) return CACHE_API_KEY; // ① memory cache

  const props = PropertiesService.getScriptProperties();
  let key = (props.getProperty(PROP_OPENAI_KEY) || '').trim();
  if (key) return (CACHE_API_KEY = key); // ② property exists

  // ③ prompt only when property is missing
  const ui = SpreadsheetApp.getUi();
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
  CACHE_API_KEY = key;
  return key;
}

// ────────────────────────────────
// 2.  SHARED HELPERS
// ────────────────────────────────
/**
 * Extract the first assistant text message from a /v1/responses API body.
 *
 * @param {ResponsesBody} body Parsed JSON response body.
 * @returns {string} Assistant text (empty string when missing).
 */
function extractRespText(body: ResponsesBody): string {
  for (const item of body.output || []) {
    if (item.type !== 'message') continue;
    const txtObj = (item.content || []).find(
      (c) => c.type === 'output_text' && typeof c.text === 'string'
    );
    if (txtObj?.text) return txtObj.text.trim();
  }
  return '';
}

/**
 * Extract URL citations (web_search tool) from a /v1/responses body.
 *
 * @param {ResponsesBody} body Parsed JSON response body.
 * @returns {string[]} URLs for citations.
 */
function extractWebSearchCitations(body: ResponsesBody): string[] {
  const msg = (body.output || []).find((o) => o.type === 'message');
  return (
    msg?.annotations
      ?.filter((a) => a.type === 'url_citation' && typeof a.url === 'string')
      .map((a) => a.url as string) || []
  );
}

/**
 * Resolve Excel‑style concatenation in custom‑function formulas.
 *
 * Supports literal strings and cell references separated by "&".
 *
 * @param {string} argStr Raw argument string from the formula.
 * @returns {string} Resolved text.
 */
function resolveConcat(argStr: string): string {
  const spreadsheet = SpreadsheetApp.getActive();
  return argStr.split('&').reduce((acc: string, piece: string) => {
    const cleaned = piece.trim();
    return (
      acc +
      (/^[A-Z]+\d+$/i.test(cleaned) || /^[^!]+![A-Z]+\d+$/i.test(cleaned)
        ? String(spreadsheet.getRange(cleaned).getValue())
        : cleaned.replace(/"/g, ''))
    );
  }, '');
}

// ────────────────────────────────
// 3.  TEXT ‑ Chat / latest Responses API (gpt‑5.2 default)
// ────────────────────────────────
/**
 * Call the OpenAI Responses API for free-form text generation.
 *
 * @param {string} prompt         User prompt.
 * @param {number} [temperature]  Sampling temperature.
 * @param {number} [max_tokens]   Max output tokens.
 * @param {string} [model]        Model identifier.
 * @returns {string} Assistant reply.
 */
function ChatGPT(
  prompt: string,
  temperature: number = TEMPERATURE,
  max_tokens: number = MAX_TOKENS,
  model: string = MODEL
): string {
  const payload = {
    model,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }],
      },
    ],
    temperature,
    max_output_tokens: max_tokens,
    text: { format: { type: 'text' } },
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', options);
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText()) as ResponsesBody;
  if (code < 200 || code > 299) {
    throw new Error(`OpenAI API error (${code}): ${body.error?.message || res.getContentText()}`);
  }
  return extractRespText(body);
}

// ────────────────────────────────
// 4.  WEB SEARCH  (Responses API + tool)
// ────────────────────────────────
/**
 * Call the OpenAI Responses API with the web_search_preview tool enabled.
 *
 * @param {string} query                Query text.
 * @param {'low'|'high'} [contextSize]  Search context size.
 * @param {number} [temperature]        Sampling temperature.
 * @param {number} [max_tokens]         Max output tokens.
 * @param {string} [model]              Model identifier.
 * @returns {{text: string, cites: string[]}} Answer text plus citation URLs.
 */
function WebSearch(
  query: string,
  contextSize: 'low' | 'high' = 'high',
  temperature: number = TEMPERATURE,
  max_tokens: number = MAX_TOKENS,
  model: string = MODEL
): { text: string; cites: string[] } {
  const payload = {
    model,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: query }],
      },
    ],
    temperature,
    max_output_tokens: max_tokens,
    text: { format: { type: 'text' } },
    tools: [
      {
        type: 'web_search_preview',
        search_context_size: contextSize,
        user_location: { type: 'approximate', country: 'TW' },
      },
    ],
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', options);
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText()) as ResponsesBody;
  if (code < 200 || code > 299) {
    throw new Error(`OpenAI API error (${code}): ${body.error?.message || res.getContentText()}`);
  }
  return {
    text: extractRespText(body),
    cites: extractWebSearchCitations(body),
  };
}

// ────────────────────────────────
// 5.  IMAGE GENERATION (gpt‑image‑1) — unchanged
// ────────────────────────────────
/**
 * Generate an image with the `gpt-image-1` model.
 *
 * @param {string} prompt    Image description.
 * @param {string} [size]    Output size (e.g., "1024x1024").
 * @param {string} [quality] Quality level ("low" | "standard" | "high" | "hd").
 * @returns {{b64_json: string, revised_prompt: string}[]} Image objects.
 */
function GPT_IMAGE(
  prompt: string,
  size: string = '1024x1024',
  quality: string = 'high'
): Array<{ b64_json: string; revised_prompt: string }> {
  const payload = {
    model: 'gpt-image-1',
    prompt,
    size,
    quality: quality.toLowerCase() === 'hd' ? 'high' : quality,
    moderation: 'low',
    output_format: 'png',
    n: 1,
  };
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/images/generations', options);
  const code = res.getResponseCode();
  if (code !== 200) throw new Error(res.getContentText());
  return JSON.parse(res.getContentText()).data; // [{ b64_json, revised_prompt }]
}

/**
 * Get or create the dedicated folder for generated images next to the sheet.
 *
 * @returns {GoogleAppsScript.Drive.Folder} Folder to store image outputs.
 */
function getOrCreateSheetFolder(): GoogleAppsScript.Drive.Folder {
  const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const parents = ssFile.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const name = 'gpt-image-1 images';
  const exists = parent.getFoldersByName(name);
  return exists.hasNext() ? exists.next() : parent.createFolder(name);
}

/**
 * Get or create the dedicated folder for speech files next to the spreadsheet.
 *
 * @returns {GoogleAppsScript.Drive.Folder} Folder to store audio outputs.
 */
function getOrCreateSpeechFolder(): GoogleAppsScript.Drive.Folder {
  const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const parents = ssFile.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const name = 'gpt-speech audio';
  const exists = parent.getFoldersByName(name);
  return exists.hasNext() ? exists.next() : parent.createFolder(name);
}

// ────────────────────────────────
// 6.  VISION (GPT‑4o multimodal)  – via Responses API
// ────────────────────────────────
/**
 * Run GPT-4o multimodal analysis on an image URL.
 *
 * @param {string} imageUrl     Remote image URL.
 * @param {string} [prompt]     Vision prompt text.
 * @param {number} [max_tokens] Maximum tokens to return.
 * @param {string} [model]      Model identifier (default "gpt-4o").
 * @param {number} [temperature] Temperature for sampling.
 * @returns {string} Model response text.
 */
function OpenAIVision(
  imageUrl: string,
  prompt: string = DEFAULT_VISION_PROMPT,
  max_tokens: number = 300,
  model: string = 'gpt-4o',
  temperature: number = 0
): string {
  if (!imageUrl) throw new Error('需要提供圖片網址 (imageUrl)。');

  const payload = {
    model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: imageUrl },
        ],
      },
    ],
    temperature,
    max_output_tokens: max_tokens,
    text: { format: { type: 'text' } },
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', options);
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText()) as ResponsesBody;
  if (code !== 200) throw new Error(`HTTP ${code}: ${res.getContentText()}`);
  return extractRespText(body);
}

// ────────────────────────────────
// 7.  SPEECH (TTS) — unchanged
// ────────────────────────────────
/**
 * Convert text to speech via OpenAI TTS and store the file in Drive.
 *
 * @param {string} text             Text to convert.
 * @param {string} [voice]          Voice name.
 * @param {string} [model]          TTS model identifier.
 * @param {string} [instructions]   Additional style instructions.
 * @param {string} [responseFormat] Audio format (e.g., "mp3").
 * @param {string} [filename]       Optional filename stem.
 * @returns {string} Public download URL for the audio file.
 */
function OpenAITTS(
  text: string,
  voice: string = DEFAULT_VOICE,
  model: string = DEFAULT_SPEECH_MODEL,
  instructions: string = DEFAULT_SPEECH_INSTRUCTIONS,
  responseFormat: string = DEFAULT_SPEECH_FMT,
  filename: string = ''
): string {
  if (!text) throw new Error('Text 不可為空白！');

  const payload: { [key: string]: string } = {
    model,
    input: text,
    voice,
    response_format: responseFormat,
  };
  const instrTrim = (instructions || '').trim();
  if (instrTrim && !/^tts-1(-hd)?$/i.test(model)) payload.instructions = instrTrim;

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/audio/speech', options);
  const code = res.getResponseCode();
  if (code !== 200) throw new Error(`OpenAI TTS error (${code}): ${res.getContentText()}`);

  const blob = res.getBlob();
  const ext = responseFormat.toLowerCase();
  const name = `${(filename || `gptSpeech_${Date.now()}.${ext}`)
    .replace(/\s+/g, '_')
    .replace(/\.[^.]+$/, '')}.${ext}`;
  blob.setName(name);

  const folder = getOrCreateSpeechFolder();
  const file = folder.createFile(blob);
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
function gpt_text(
  promptRef: string,
  temperature: number = TEMPERATURE,
  max_tokens: number = MAX_TOKENS,
  model: string = MODEL,
  outputDirection: 'right' | 'below' | string = 'right',
  parallel: boolean = false
): string {
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
function gpt_search(
  queryRef: string,
  contextSize: 'low' | 'high' | string = 'high',
  temperature: number = TEMPERATURE,
  max_tokens: number = MAX_TOKENS,
  model: string = MODEL,
  parallel: boolean = false
): string {
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
function gpt_image(promptRef: string, size: string = '1024x1024', quality: string = 'high'): string {
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
function gpt_vision(
  imageUrlRef: string,
  promptRef: string = `"${DEFAULT_VISION_PROMPT}"`,
  max_tokens: number = 300,
  model: string = 'gpt-4o',
  outputDirection: 'right' | 'below' | string = 'right'
): string {
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
function gpt_speech(
  textRef: string,
  voice: string = `"${DEFAULT_VOICE}"`,
  model: string = `"${DEFAULT_SPEECH_MODEL}"`,
  instructions: string = `"${DEFAULT_SPEECH_INSTRUCTIONS}"`,
  responseFormat: string = `"${DEFAULT_SPEECH_FMT}"`,
  filename: string = '""',
  outputDirection: 'right' | 'below' | string = 'right'
): string {
  return 'Ready for Run OpenAI';
}

// ────────────────────────────────
// 9.  UNIVERSAL RUNNER — “Run OpenAI”
// ────────────────────────────────
/**
 * Universal dispatcher that scans the active selection, executes OpenAI calls,
 * and writes results or queued batches back to the sheet.
 */
function runOpenAI(): void {
  getApiKey_(); // ensure key present

  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert('請先選取要處理的範圍。');
    return;
  }
  const rows = range.getNumRows();
  const cols = range.getNumColumns();

  /* 佇列收集 */
  const textTasks: TextTask[] = [];
  const searchTasks: SearchTask[] = [];
  let totalParallel = 0;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const cell = range.getCell(r, c);
      const formula = cell.getFormula() || '';

      /* ---------- GPT_TEXT ---------- */
      if (formula.includes('gpt_text(')) {
        try {
          const argStr = formula.split('gpt_text(')[1].split(')')[0];
          const [
            promptRaw,
            tempRaw = TEMPERATURE,
            tokensRaw = MAX_TOKENS,
            modelRaw = `"${MODEL}"`,
            dirRaw = '"right"',
            parallelRaw = 'false',
          ] = argStr.split(/\s*,\s*/);

          const prompt = resolveConcat(promptRaw);
          const temperatureVal = Number(tempRaw);
          const maxTokensVal = Number(tokensRaw);
          const model = modelRaw.replace(/"/g, '');
          const direction = (dirRaw.replace(/"/g, '').toLowerCase() || 'right') as
            | 'right'
            | 'below';
          const isParallel = /true|1|parallel/i.test(parallelRaw.replace(/"/g, ''));

          const outCell =
            direction === 'below'
              ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
              : sheet.getRange(cell.getRow(), cell.getColumn() + 1);

          if (isParallel) {
            textTasks.push({
              prompt,
              temperature: temperatureVal,
              max_tokens: maxTokensVal,
              model,
              outCell,
            });
            totalParallel++;
          } else {
            const answer = ChatGPT(prompt, temperatureVal, maxTokensVal, model);
            outCell.setValue(answer);
          }
        } catch (err) {
          SpreadsheetApp.getUi().alert('ChatGPT error: ' + (err as Error).message);
        }
        continue;
      }

      /* ---------- GPT_SEARCH ---------- */
      if (formula.includes('gpt_search(')) {
        try {
          const argStr = formula.split('gpt_search(')[1].split(')')[0];
          const [
            queryRaw,
            ctxtRaw = '"high"',
            tempRaw = TEMPERATURE,
            tokensRaw = MAX_TOKENS,
            modelRaw = `"${MODEL}"`,
            parallelRaw = 'false',
          ] = argStr.split(/\s*,\s*/);

          const query = resolveConcat(queryRaw);
          const contextSize = ctxtRaw.replace(/"/g, '') || 'high';
          const temperatureVal = Number(tempRaw);
          const maxTokensVal = Number(tokensRaw);
          const model = modelRaw.replace(/"/g, '');
          const isParallel = /true|1|parallel/i.test(parallelRaw.replace(/"/g, ''));

          const answerCell = sheet.getRange(cell.getRow(), cell.getColumn() + 1);
          const citeCell = sheet.getRange(cell.getRow(), cell.getColumn() + 2);

          if (isParallel) {
            searchTasks.push({
              query,
              contextSize,
              temperature: temperatureVal,
              max_tokens: maxTokensVal,
              model,
              answerCell,
              citeCell,
            });
            totalParallel++;
          } else {
            const { text: answer, cites } = WebSearch(
              query,
              contextSize === 'low' ? 'low' : 'high',
              temperatureVal,
              maxTokensVal,
              model
            );
            answerCell.setValue(answer);
            citeCell.setValue(cites.join(', '));
          }
        } catch (err) {
          SpreadsheetApp.getUi().alert('Web Search error: ' + (err as Error).message);
        }
        continue;
      }

      /* ---------- GPT_IMAGE ---------- */
      if (formula.includes('gpt_image(')) {
        try {
          const argStr = formula.split('gpt_image(')[1].split(')')[0];
          const [promptRaw, sizeRaw = '"1024x1024"', qualRaw = '"high"'] = argStr.split(
            /\s*,\s*/
          );
          const prompt = resolveConcat(promptRaw);
          const size = sizeRaw.replace(/"/g, '');
          const quality = qualRaw.replace(/"/g, '');
          const imgData = GPT_IMAGE(prompt, size, quality)[0];
          const folder = getOrCreateSheetFolder();
          const name = `gptImage_${Date.now()}.png`;
          const bytes = Utilities.base64Decode(imgData.b64_json);
          const blob = Utilities.newBlob(bytes, 'image/png', name);
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          const url = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
          sheet.getRange(cell.getRow(), cell.getColumn() + 1).setValue(url);
          sheet.getRange(cell.getRow(), cell.getColumn() + 2).setValue(prompt);
        } catch (err) {
          SpreadsheetApp.getUi().alert('Image generation error: ' + (err as Error).message);
        }
        continue;
      }

      /* ---------- GPT_VISION ---------- */
      if (formula.includes('gpt_vision(')) {
        try {
          const argStr = formula.split('gpt_vision(')[1].split(')')[0];
          const [
            urlRaw,
            promptRaw = `"${DEFAULT_VISION_PROMPT}"`,
            tokensRaw = 300,
            modelRaw = '"gpt-4o"',
            dirRaw = '"right"',
          ] = argStr.split(/\s*,\s*/);
          const imageUrl = resolveConcat(urlRaw);
          const prompt = resolveConcat(promptRaw) || DEFAULT_VISION_PROMPT;
          const maxTokensVal = Number(tokensRaw);
          const model = modelRaw.replace(/"/g, '');
          const direction = (dirRaw.replace(/"/g, '').toLowerCase() || 'right') as
            | 'right'
            | 'below';

          const answer = OpenAIVision(imageUrl, prompt, maxTokensVal, model);

          const outCell =
            direction === 'below'
              ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
              : sheet.getRange(cell.getRow(), cell.getColumn() + 1);
          outCell.setValue(answer);
        } catch (err) {
          SpreadsheetApp.getUi().alert('Vision error: ' + (err as Error).message);
        }
        continue;
      }

      /* ---------- GPT_SPEECH ---------- */
      if (formula.includes('gpt_speech(')) {
        try {
          const argStr = formula.split('gpt_speech(')[1].split(')')[0];
          const [
            textRaw,
            voiceRaw = `"${DEFAULT_VOICE}"`,
            modelRaw = `"${DEFAULT_SPEECH_MODEL}"`,
            instrRaw = `"${DEFAULT_SPEECH_INSTRUCTIONS}"`,
            fmtRaw = `"${DEFAULT_SPEECH_FMT}"`,
            fileRaw = '""',
            dirRaw = '"right"',
          ] = argStr.split(/\s*,\s*/);

          const text = resolveConcat(textRaw);
          const voice = voiceRaw.replace(/"/g, '') || DEFAULT_VOICE;
          const model = modelRaw.replace(/"/g, '') || DEFAULT_SPEECH_MODEL;
          const instructions = resolveConcat(instrRaw) || DEFAULT_SPEECH_INSTRUCTIONS;
          const fmt = fmtRaw.replace(/"/g, '') || DEFAULT_SPEECH_FMT;
          const filename = resolveConcat(fileRaw).replace(/"/g, '');
          const direction = (dirRaw.replace(/"/g, '').toLowerCase() || 'right') as
            | 'right'
            | 'below';

          const url = OpenAITTS(text, voice, model, instructions, fmt, filename);

          const outCell =
            direction === 'below'
              ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
              : sheet.getRange(cell.getRow(), cell.getColumn() + 1);
          outCell.setValue(url);
        } catch (err) {
          SpreadsheetApp.getUi().alert('Speech error: ' + (err as Error).message);
        }
      }
    }
  }

  /* ── 平行佇列分批送出 ── */
  let processed = 0;
  const total = totalParallel;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

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
/** Prompt for API key and rebuild menu; useful for manual initialization. */
function setup(): void {
  getApiKey_(); // prompt for key if missing
  onOpen(); // build menu
}
/** Add the “Run OpenAI” item under the OpenAI menu on sheet open. */
function onOpen(): void {
  SpreadsheetApp.getUi().createMenu(MENU_ROOT).addItem('Run OpenAI', 'runOpenAI').addToUi();
}

// ────────────────────────────────
// 11.  OPTIONAL QUICK TESTS
// ────────────────────────────────
function testRunOpenAI_Image(): void {
  const res = GPT_IMAGE('Sunset over a futuristic city in watercolor')[0];
  Logger.log('Bytes:', res.b64_json.length);
}
function testRunOpenAI_Search(): void {
  const { text, cites } = WebSearch('positive news story from today');
  Logger.log('Answer:', text);
  Logger.log('Cites :', cites.join(', '));
}
function testRunOpenAI_Vision(): void {
  const url =
    'https://raw.githubusercontent.com/google/material-design-icons/master/src/social/mood/materialicons/24px.svg';
  const ans = OpenAIVision(url, '這是什麼圖示？');
  Logger.log('Vision:', ans);
}
function testRunOpenAI_Speech(): void {
  const url = OpenAITTS('這是一段測試語音，歡迎使用！');
  Logger.log('Speech URL:', url);
}

/* ────────────────────────────────────────────────
 * 11‑A.  平行批次處理工具
 * ────────────────────────────────────────────────*/
/**
 * Process a batch of text-generation requests in parallel via fetchAll.
 *
 * @param {Array<{prompt: string, temperature: number, max_tokens: number, model: string, outCell: GoogleAppsScript.Spreadsheet.Range}>} batch
 *        Batched tasks with output targets.
 * @returns {number} Number of completed requests.
 */
function processTextBatch(batch: TextTask[]): number {
  if (!batch.length) return 0;
  const requests: GoogleAppsScript.URL_Fetch.URLFetchRequest[] = batch.map((t) => ({
    url: 'https://api.openai.com/v1/responses',
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: t.model,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: t.prompt }],
        },
      ],
      temperature: t.temperature,
      max_output_tokens: t.max_tokens,
      text: { format: { type: 'text' } },
    }),
  }));
  const responses = UrlFetchApp.fetchAll(requests);
  let done = 0;
  responses.forEach((res, i) => {
    let answer = '';
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      answer = extractRespText(JSON.parse(res.getContentText()) as ResponsesBody);
    } else {
      /* ——— 重試一次 (單筆順序) ——— */
      try {
        const retry = UrlFetchApp.fetch(requests[i].url, requests[i]);
        if (retry.getResponseCode() >= 200 && retry.getResponseCode() < 300) {
          answer = extractRespText(JSON.parse(retry.getContentText()) as ResponsesBody);
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

/**
 * Process a batch of web-search responses in parallel via fetchAll.
 *
 * @param {Array<{query: string, contextSize: string, temperature: number, max_tokens: number, model: string, answerCell: GoogleAppsScript.Spreadsheet.Range, citeCell: GoogleAppsScript.Spreadsheet.Range}>} batch
 *        Batched search tasks with output targets.
 * @returns {number} Number of completed requests.
 */
function processSearchBatch(batch: SearchTask[]): number {
  if (!batch.length) return 0;
  const requests: GoogleAppsScript.URL_Fetch.URLFetchRequest[] = batch.map((t) => ({
    url: 'https://api.openai.com/v1/responses',
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: t.model,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: t.query }],
        },
      ],
      temperature: t.temperature,
      max_output_tokens: t.max_tokens,
      text: { format: { type: 'text' } },
      tools: [
        {
          type: 'web_search_preview',
          search_context_size: t.contextSize,
          user_location: { type: 'approximate', country: 'TW' },
        },
      ],
    }),
  }));
  const responses = UrlFetchApp.fetchAll(requests);
  let done = 0;
  responses.forEach((res, i) => {
    let answer = '';
    let cites: string[] = [];
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      const body = JSON.parse(res.getContentText()) as ResponsesBody;
      answer = extractRespText(body);
      cites = extractWebSearchCitations(body);
    } else {
      /* ——— 重試一次 (單筆順序) ——— */
      try {
        const retry = UrlFetchApp.fetch(requests[i].url, requests[i]);
        if (retry.getResponseCode() >= 200 && retry.getResponseCode() < 300) {
          const body = JSON.parse(retry.getContentText()) as ResponsesBody;
          answer = extractRespText(body);
          cites = extractWebSearchCitations(body);
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
