require('dotenv').config();
const promptCache = new Map();
const CACHE_MAX_ENTRIES = 500;

function enforceCacheLimit() {
    while (promptCache.size > CACHE_MAX_ENTRIES) {
        const oldestKey = promptCache.keys().next().value;
        if (oldestKey === undefined) break;
        promptCache.delete(oldestKey);
    }
}

const MODELS = [
    'qwen/qwen3.6-plus:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'openai/gpt-oss-120b:free',
    'google/gemma-3n-e2b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-coder:free',
    'arcee-ai/trinity-mini:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'minimax/minimax-m2.5:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'google/gemma-3-12b-it:free',
    'google/gemma-3-27b-it:free'
];

const FINAL_FALLBACK_MODEL = 'google/gemma-3-12b-it:free';

const API_KEYS = [
    process.env.OPENROUTER_API_KEY,
    process.env.API_KEY_1, process.env.API_KEY_2, process.env.API_KEY_3, process.env.API_KEY_4,
    process.env.API_KEY_5, process.env.API_KEY_6, process.env.API_KEY_7, process.env.API_KEY_8,
    process.env.API_KEY_9, process.env.API_KEY_10, process.env.API_KEY_11, process.env.API_KEY_12,
    process.env.API_KEY_13, process.env.API_KEY_14, process.env.API_KEY_15, process.env.API_KEY_16,
    process.env.API_KEY_17, process.env.API_KEY_18, process.env.API_KEY_19, process.env.API_KEY_20
].filter(key => key && key.trim() !== "");

exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { prompt, system } = body;
    if (!prompt) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
    }

    const normalizedPrompt = prompt.trim().toLowerCase();
    if (promptCache.has(normalizedPrompt)) {
        return { statusCode: 200, body: JSON.stringify({ result: promptCache.get(normalizedPrompt) }) };
    }

    let lastError = null;
    for (let i = 0; i < API_KEYS.length; i++) {
        const apiKey = API_KEYS[i];
        const modelId = MODELS[i % MODELS.length];

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://promptstudio.pro',
                    'X-Title': 'Prompt Studio'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: "user", content: system ? `${system}\n\n${prompt}` : prompt }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const generatedText = data.choices[0].message.content || 'No content generated';
                promptCache.set(normalizedPrompt, generatedText);
                enforceCacheLimit();
                return { statusCode: 200, body: JSON.stringify({ result: generatedText }) };
            } else {
                const errorText = await response.text();
                lastError = errorText;
                continue;
            }
        } catch (err) {
            lastError = err.message;
            continue;
        }
    }

    return { statusCode: 500, body: JSON.stringify({ error: `All models failed. Last error: ${lastError}` }) };
};
