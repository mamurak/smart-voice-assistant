/* ============================================================
   langs.js — TTS language catalog.
   31 languages (the pipeline-wide supported set, constrained
   by the LLM) plus `na` language-agnostic.
   ============================================================ */

const TTS_LANGS = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'pl', name: 'Polish' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'el', name: 'Greek' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'et', name: 'Estonian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'na', name: 'Auto (language-agnostic)' }
];

const PREVIEW_SAMPLES = {
  en: 'Hello, this is a preview of the voice.',
  ar: 'مرحبًا، هذه معاينة للصوت.',
  hi: 'नमस्ते, यह आवाज़ का पूर्वावलोकन है।',
  id: 'Halo, ini adalah pratinjau suara ini.',
  fr: 'Bonjour, ceci est un aperçu de la voix.',
  es: 'Hola, esta es una vista previa de la voz.',
  tr: 'Merhaba, bu sesin bir önizlemesidir.',
  de: 'Hallo, dies ist eine Vorschau der Stimme.',
  it: "Ciao, questa è un’anteprima della voce.",
  pt: 'Olá, esta é uma prévia da voz.',
  nl: 'Hallo, dit is een voorbeeld van de stem.',
  ru: 'Здравствуйте, это предпросмотр голоса.',
  ja: 'こんにちは、これは音声のプレビューです。',
  ko: '안녕하세요, 이것은 음성 미리듣기입니다.'
};

function previewText(code) {
  return PREVIEW_SAMPLES[code] || PREVIEW_SAMPLES.en;
}

if (typeof window !== 'undefined') {
  window.TTS_LANGS = TTS_LANGS;
  window.previewText = previewText;
}
