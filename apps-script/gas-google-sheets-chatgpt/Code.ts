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
  annotations?: ResponsesAnnotation[];
  [key: string]: unknown;
};

type ResponsesMessage = {
  type?: string;
  content?: ResponsesContent[];
};

type ResponsesBody = {
  output?: ResponsesMessage[];
  error?: { message?: string };
};

type TextTask = {
  userPrompt: string;
  developerPrompt: string;
  reasoningEffort: string;
  verbosity: string;
  model: string;
  outCell: GoogleAppsScript.Spreadsheet.Range;
};

type SearchTask = {
  query: string;
  contextSize: string;
  reasoningEffort: string;
  verbosity: string;
  model: string;
  answerCell: GoogleAppsScript.Spreadsheet.Range;
  citeCell: GoogleAppsScript.Spreadsheet.Range;
};

type LegacyTextTask = {
  prompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  outCell: GoogleAppsScript.Spreadsheet.Range;
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
  const urls: string[] = [];
  for (const item of body.output || []) {
    if (item.type !== 'message') continue;
    for (const part of item.content || []) {
      const anns = part.annotations || [];
      for (const a of anns) {
        if (a.type === 'url_citation' && typeof a.url === 'string') {
          urls.push(a.url);
        }
      }
    }
  }
  return urls;
}

function unescapeSheetString_(s: string): string {
  if (!/^".*"$/.test(s)) return s;
  const inner = s.slice(1, -1);
  return inner.replace(/""/g, '"');
}

function isCellReference_(token: string): boolean {
  return /^\$?[A-Z]+\$?\d+$/i.test(token) || /^[^!]+!\$?[A-Z]+\$?\d+$/i.test(token);
}

function isNumericString_(s: string): boolean {
  if (s === null || s === undefined) return false;
  const trimmed = s.trim();
  if (!trimmed) return false;
  return !isNaN(Number(trimmed));
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
    if (!cleaned) return acc;
    if (isCellReference_(cleaned)) {
      const ref = cleaned.replace(/\$/g, '');
      return acc + String(spreadsheet.getRange(ref).getValue());
    }
    return acc + unescapeSheetString_(cleaned);
  }, '');
}

function maxOutputTokensForModel_(model: string): number {
  const m = (model || '').trim();
  if (/-chat-latest$/i.test(m)) return 16384;
  if (/^gpt-5-pro$/i.test(m)) return 272000;
  if (/^gpt-5(\.|-)/i.test(m)) return 128000;
  return 8000;
}

function normalizeEffort_(model: string, effortRaw: string): string {
  const m = (model || '').trim();
  const effort = (effortRaw || 'none').trim().toLowerCase();
  const allowed = new Set(['none', 'low', 'medium', 'high', 'xhigh']);
  if (!allowed.has(effort)) throw new Error(`Invalid reasoningEffort: ${effort}`);
  if (/^gpt-5\.2-pro$/i.test(m) && (effort === 'none' || effort === 'low')) {
    throw new Error(`Model ${m} does not support reasoningEffort="${effort}". Use medium/high/xhigh.`);
  }
  return effort;
}

function normalizeVerbosity_(vRaw: string): string {
  const v = (vRaw || 'medium').trim().toLowerCase();
  if (!['low', 'medium', 'high'].includes(v)) throw new Error(`Invalid verbosity: ${v}`);
  return v;
}

function buildTextPayload_(
  userPrompt: string,
  developerPrompt: string,
  model: string,
  effort: string,
  verbosity: string
): Record<string, unknown> {
  const input: Array<Record<string, unknown>> = [];
  const dev = (developerPrompt || '').trim();
  const user = (userPrompt || '').trim();

  if (dev) {
    input.push({ role: 'developer', content: [{ type: 'input_text', text: dev }] });
  }
  input.push({ role: 'user', content: [{ type: 'input_text', text: user }] });

  const eff = normalizeEffort_(model, effort);
  const verb = normalizeVerbosity_(verbosity);

  return {
    model,
    input,
    text: { format: { type: 'text' }, verbosity: verb },
    reasoning: { effort: eff, summary: 'auto' },
    max_output_tokens: maxOutputTokensForModel_(model),
    store: false,
  };
}

function buildWebSearchPayload_(
  query: string,
  model: string,
  effort: string,
  verbosity: string,
  contextSize: string
): Record<string, unknown> {
  const q = (query || '').trim();
  const eff = normalizeEffort_(model, effort);
  const verb = normalizeVerbosity_(verbosity);
  const ctx = (contextSize || 'high').toLowerCase() === 'low' ? 'low' : 'high';

  return {
    model,
    input: [{ role: 'user', content: [{ type: 'input_text', text: q }] }],
    text: { format: { type: 'text' }, verbosity: verb },
    reasoning: { effort: eff, summary: 'auto' },
    max_output_tokens: maxOutputTokensForModel_(model),
    store: false,
    tools: [
      {
        type: 'web_search_preview',
        search_context_size: ctx,
        user_location: { type: 'approximate', country: 'TW' },
      },
    ],
  };
}

function callResponses_(payload: Record<string, unknown>): ResponsesBody {
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${getApiKey_()}` },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', options);
  const code = res.getResponseCode();
  const text = res.getContentText();
  const body = JSON.parse(text) as ResponsesBody;

  if (code < 200 || code > 299) {
    const msg = body?.error?.message || text;
    throw new Error(`OpenAI API error (${code}): ${msg}`);
  }
  return body;
}

function extractFuncArgs_(formula: string, funcName: string): string | null {
  const needle = `${funcName}(`;
  const start = formula.indexOf(needle);
  if (start < 0) return null;

  let i = start + needle.length;
  let depth = 1;
  let inQuotes = false;
  let args = '';

  for (; i < formula.length; i++) {
    const ch = formula[i];
    if (ch === '"') {
      if (inQuotes && formula[i + 1] === '"') {
        args += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      args += ch;
      continue;
    }

    if (!inQuotes) {
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    args += ch;
  }

  return args;
}

function splitTopLevelArgs_(argStr: string): string[] {
  const s = String(argStr || '');
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (ch === '"') {
      if (inQuotes && s[i + 1] === '"') {
        cur += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }

    if (!inQuotes) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);

      if (ch === ',' && depth === 0) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
    }

    cur += ch;
  }

  if (cur.length || s.trim() !== '') out.push(cur.trim());
  return out.filter((x) => x !== '');
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
function gpt_text_old(
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
 * New gpt_text v2 with developer prompt, reasoning effort, and verbosity.
 *
 * @param {string} userPromptRef          User prompt string or cell reference.
 * @param {string} [developerRef=""]      Developer message string or cell reference.
 * @param {string} [model="gpt-5.2"]      Model name (e.g. "gpt-5.2-pro", "gpt-5.2-chat-latest").
 * @param {string} [reasoningEffort="none"] none | low | medium | high | xhigh.
 * @param {string} [verbosity="medium"]   low | medium | high.
 * @param {boolean} [parallel=false]      Queue for parallel execution.
 * @return {string}                       Placeholder — shows "Ready for Run OpenAI".
 * @customfunction
 */
function gpt_text(
  userPromptRef: string,
  developerRef: string = '""',
  model: string = `"${MODEL}"`,
  reasoningEffort: string = '"none"',
  verbosity: string = '"medium"',
  parallel: boolean = false
): string {
  return 'Ready for Run OpenAI';
}

/**
 * Performs a web‑augmented search via OpenAI.
 *
 * @param {string} queryRef                 Query string or cell reference.
 * @param {string} [contextSize="high"]     Search context size ("low"|"high").
 * @param {string} [model="gpt-5.2"]        Model name.
 * @param {string} [reasoningEffort="none"] none | low | medium | high | xhigh.
 * @param {string} [verbosity="medium"]     low | medium | high.
 * @param {boolean} [parallel=false]        Queue for parallel execution.
 * @return {string}                         Answer text. Citations go in the next cell to the right.
 * @customfunction
 */
function gpt_search(
  queryRef: string,
  contextSize: 'low' | 'high' | string = 'high',
  model: string = `"${MODEL}"`,
  reasoningEffort: string = '"none"',
  verbosity: string = '"medium"',
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
  const legacyTextTasks: LegacyTextTask[] = [];
  const searchTasks: SearchTask[] = [];
  let totalParallel = 0;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const cell = range.getCell(r, c);
      const formula = cell.getFormula() || '';

      /* ---------- GPT_TEXT (legacy) ---------- */
      if (formula.includes('gpt_text_old(')) {
        let legacyOutCell: GoogleAppsScript.Spreadsheet.Range | null = null;
        try {
          const argStr = extractFuncArgs_(formula, 'gpt_text_old') || '';
          const args = splitTopLevelArgs_(argStr);
          const promptRaw = args[0] || '""';
          const tempRaw = args[1] || `${TEMPERATURE}`;
          const tokensRaw = args[2] || `${MAX_TOKENS}`;
          const modelRaw = args[3] || `"${MODEL}"`;
          const dirRaw = args[4] || '"right"';
          const parallelRaw = args[5] || 'false';

          const prompt = resolveConcat(promptRaw);
          const temperatureVal = Number(resolveConcat(String(tempRaw)));
          const maxTokensVal = Number(resolveConcat(String(tokensRaw)));
          const model = resolveConcat(modelRaw).replace(/"/g, '') || MODEL;
          const direction = (resolveConcat(dirRaw).replace(/"/g, '').toLowerCase() ||
            'right') as 'right' | 'below';
          const isParallel = /true|1|parallel/i.test(
            resolveConcat(parallelRaw).replace(/"/g, '')
          );

          const outCell =
            direction === 'below'
              ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
              : sheet.getRange(cell.getRow(), cell.getColumn() + 1);
          legacyOutCell = outCell;

          if (isParallel) {
            legacyTextTasks.push({
              prompt,
              temperature: temperatureVal,
              maxTokens: maxTokensVal,
              model,
              outCell,
            });
            totalParallel++;
          } else {
            const answer = ChatGPT(prompt, temperatureVal, maxTokensVal, model);
            outCell.setValue(answer);
          }
        } catch (err) {
          legacyOutCell?.setValue(`ERROR: ${(err as Error).message}`);
        }
        continue;
      }

      /* ---------- GPT_TEXT ---------- */
      if (formula.includes('gpt_text(')) {
        const fallbackOutCell = sheet.getRange(cell.getRow(), cell.getColumn() + 1);
        try {
          const argStr = extractFuncArgs_(formula, 'gpt_text') || '';
          const args = splitTopLevelArgs_(argStr);

          /* detect legacy signature: gpt_text(prompt, temperature, max_tokens, model, dir, parallel) */
          const tempCandidate = resolveConcat(args[1] || '').replace(/"/g, '');
          const tokensCandidate = resolveConcat(args[2] || '').replace(/"/g, '');
          const looksLegacy = isNumericString_(tempCandidate) && isNumericString_(tokensCandidate);

          if (looksLegacy) {
            const prompt = resolveConcat(args[0] || '""');
            const temperatureVal = Number(tempCandidate);
            const maxTokensVal = Number(tokensCandidate);
            const model = resolveConcat(args[3] || `"${MODEL}"`).replace(/"/g, '') || MODEL;
            const dirRaw = args[4] || '"right"';
            const direction = (resolveConcat(dirRaw).replace(/"/g, '').toLowerCase() ||
              'right') as 'right' | 'below';
            const isParallel = /true|1|parallel/i.test(
              resolveConcat(args[5] || 'false').replace(/"/g, '')
            );

            const outCell =
              direction === 'below'
                ? sheet.getRange(cell.getRow() + 1, cell.getColumn())
                : sheet.getRange(cell.getRow(), cell.getColumn() + 1);

            if (isParallel) {
              legacyTextTasks.push({
                prompt,
                temperature: temperatureVal,
                maxTokens: maxTokensVal,
                model,
                outCell,
              });
              totalParallel++;
            } else {
              const answer = ChatGPT(prompt, temperatureVal, maxTokensVal, model);
              outCell.setValue(answer);
            }
          } else {
            const userRaw = args[0] || '""';
            const devRaw = args[1] || '""';
            const modelRaw = args[2] || `"${MODEL}"`;
            const effRaw = args[3] || '"none"';
            const verbRaw = args[4] || '"medium"';
            const parallelRaw = args[5] || 'false';

            const userPrompt = resolveConcat(userRaw);
            const developerPrompt = resolveConcat(devRaw);
            const model = resolveConcat(modelRaw).replace(/"/g, '') || MODEL;
            const reasoningEffort = resolveConcat(effRaw).replace(/"/g, '') || 'none';
            const verbosity = resolveConcat(verbRaw).replace(/"/g, '') || 'medium';
            const isParallel = /true|1|parallel/i.test(
              resolveConcat(parallelRaw).replace(/"/g, '')
            );

            const outCell = sheet.getRange(cell.getRow(), cell.getColumn() + 1);
            if (isParallel) {
              textTasks.push({
                userPrompt,
                developerPrompt,
                model,
                reasoningEffort,
                verbosity,
                outCell,
              });
              totalParallel++;
            } else {
              const payload = buildTextPayload_(userPrompt, developerPrompt, model, reasoningEffort, verbosity);
              const body = callResponses_(payload);
              outCell.setValue(extractRespText(body));
            }
          }
        } catch (err) {
          fallbackOutCell.setValue(`ERROR: ${(err as Error).message}`);
        }
        continue;
      }

      /* ---------- GPT_SEARCH ---------- */
      if (formula.includes('gpt_search(')) {
        const answerCell = sheet.getRange(cell.getRow(), cell.getColumn() + 1);
        const citeCell = sheet.getRange(cell.getRow(), cell.getColumn() + 2);
        try {
          const argStr = extractFuncArgs_(formula, 'gpt_search') || '';
          const args = splitTopLevelArgs_(argStr);

          const queryRaw = args[0] || '""';
          const ctxtRaw = args[1] || '"high"';
          const modelRaw = args[2] || `"${MODEL}"`;
          const effRaw = args[3] || '"none"';
          const verbRaw = args[4] || '"medium"';
          const parallelRaw = args[5] || 'false';

          const query = resolveConcat(queryRaw);
          const contextSize = resolveConcat(ctxtRaw).replace(/"/g, '') || 'high';
          const model = resolveConcat(modelRaw).replace(/"/g, '') || MODEL;
          const reasoningEffort = resolveConcat(effRaw).replace(/"/g, '') || 'none';
          const verbosity = resolveConcat(verbRaw).replace(/"/g, '') || 'medium';
          const isParallel = /true|1|parallel/i.test(
            resolveConcat(parallelRaw).replace(/"/g, '')
          );

          if (isParallel) {
            searchTasks.push({
              query,
              contextSize,
              model,
              reasoningEffort,
              verbosity,
              answerCell,
              citeCell,
            });
            totalParallel++;
          } else {
            const payload = buildWebSearchPayload_(query, model, reasoningEffort, verbosity, contextSize);
            const body = callResponses_(payload);
            answerCell.setValue(extractRespText(body));
            citeCell.setValue(extractWebSearchCitations(body).join(', '));
          }
        } catch (err) {
          answerCell.setValue(`ERROR: ${(err as Error).message}`);
          citeCell.setValue('');
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
  for (let i = 0; i < legacyTextTasks.length; i += PARALLEL_BATCH_SIZE) {
    processed += processLegacyTextBatch(legacyTextTasks.slice(i, i + PARALLEL_BATCH_SIZE));
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
function processLegacyTextBatch(batch: LegacyTextTask[]): number {
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
      max_output_tokens: t.maxTokens,
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
 * Process a batch of text-generation requests in parallel via fetchAll.
 *
 * @param {Array<{userPrompt: string, developerPrompt: string, reasoningEffort: string, verbosity: string, model: string, outCell: GoogleAppsScript.Spreadsheet.Range}>} batch
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
    payload: JSON.stringify(
      buildTextPayload_(t.userPrompt, t.developerPrompt, t.model, t.reasoningEffort, t.verbosity)
    ),
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
 * @param {Array<{query: string, contextSize: string, reasoningEffort: string, verbosity: string, model: string, answerCell: GoogleAppsScript.Spreadsheet.Range, citeCell: GoogleAppsScript.Spreadsheet.Range}>} batch
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
    payload: JSON.stringify(
      buildWebSearchPayload_(t.query, t.model, t.reasoningEffort, t.verbosity, t.contextSize)
    ),
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
