// AI Teacher: a chat tutor for Quran reading, tajweed, namaz, duas and basic Islamic knowledge.
// It talks to any "OpenAI-compatible" chat service. These have a free plan or are fully free:
//   gemini      Google AI Studio free key  (aistudio.google.com/apikey)
//   groq        Groq free key              (console.groq.com/keys)
//   openrouter  OpenRouter key, ":free" models (openrouter.ai/keys)
//   ollama      Runs on your own computer, no key, no limits (ollama.com), needs a computer that can run the model
// Free plans, model names and limits change. If a provider says the model is not found, set AI_MODEL in .env.
const PRESETS = {
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash', needsKey: true },
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', needsKey: true },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free', needsKey: true },
  ollama: { url: 'http://127.0.0.1:11434/v1/chat/completions', model: 'llama3.2', needsKey: false },
};

module.exports = {
  PRESETS,
  MESSAGE_MAX: 1000, // characters in one question
  HISTORY_MAX: 8, // earlier messages sent along so the teacher remembers the chat
  HISTORY_ITEM_MAX: 1500,
  ANSWER_TOKENS: 900,
};
