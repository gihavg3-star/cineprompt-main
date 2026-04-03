const express = require('express');
const app = express();
app.use(express.json());

const promptCache = new Map();
const CACHE_MAX_ENTRIES = 500;

function enforceCacheLimit() {
    while (promptCache.size > CACHE_MAX_ENTRIES) {
        const oldestKey = promptCache.keys().next().value;
        if (oldestKey === undefined) break;
        promptCache.delete(oldestKey);
    }
}

setInterval(() => {
    promptCache.clear();
}, 24 * 60 * 60 * 1000);

// Verified Free Model List from OpenRouter
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

// Array of API Keys for fallback/rate-limit prevention (prioritize main API_KEY)
const API_KEYS = [
    process.env.API_KEY, // Main key from .env
    process.env.API_KEY_1, process.env.API_KEY_2, process.env.API_KEY_3, process.env.API_KEY_4,
    process.env.API_KEY_5, process.env.API_KEY_6, process.env.API_KEY_7, process.env.API_KEY_8,
    process.env.API_KEY_9, process.env.API_KEY_10, process.env.API_KEY_11, process.env.API_KEY_12,
    process.env.API_KEY_13, process.env.API_KEY_14, process.env.API_KEY_15, process.env.API_KEY_16,
    process.env.API_KEY_17, process.env.API_KEY_18, process.env.API_KEY_19, process.env.API_KEY_20
].filter(key => key && key.trim() !== "");

// Default fallback key if no env variables are set (using the one from previous version)
const DEFAULT_KEY = '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';
if (API_KEYS.length === 0) {
    API_KEYS.push(DEFAULT_KEY);
}

// Log all requests
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

app.post('/api/generate', async (req, res) => {
    console.log("Request received for generation...");
    const { prompt, system } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const normalizedPrompt = prompt.trim().toLowerCase();
    if (promptCache.has(normalizedPrompt)) {
        console.log('⚡ Serving from Cache!');
        return res.json({ result: promptCache.get(normalizedPrompt) });
    }

    let lastError = null;

    // Iterate through all available keys and models (up to 20 keys)
    for (let i = 0; i < API_KEYS.length; i++) {
        const apiKey = API_KEYS[i];
        const modelId = MODELS[i % MODELS.length];
        console.log('Trying Model:', modelId);

        const requestPayload = {
            model: modelId,
            messages: [{ role: "user", content: system ? `${system}\n\n${prompt}` : prompt }]
        };

        // Debugging Payload
        console.log('--- Request Payload ---');
        console.log(JSON.stringify(requestPayload, null, 2));

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Prompt Studio'
                },
                body: JSON.stringify(requestPayload)
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Model ${i + 1} succeeded!`);
                const generatedText = data.choices[0].message.content || 'No content generated';
                promptCache.set(normalizedPrompt, generatedText);
                enforceCacheLimit();
                console.log('✅ Serving from Live Model:', modelId);
                return res.json({ result: generatedText });
            } else {
                // Detailed Error Logging
                const errorText = await response.text();
                
                // Check for Rate Limit (429)
                if (response.status === 429) {
                    console.log('Model' + (i + 1) + ' rate limited. Waiting 2s before trying next...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                console.error(`⚠️ Model ${i + 1} failed with status ${response.status}:`, errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: { message: errorText } };
                }
                
                lastError = errorData?.error?.message || `Error: ${response.status}`;
                console.log('Model failed:', modelId, 'Reason:', lastError);

                // Continue to next model if appropriate
                continue;
            }
        } catch (err) {
            console.error(`❌ Model ${i + 1} connection error:`, err.message);
            lastError = err.message;
            continue;
        }
    }

    // FINAL HARDCODED FALLBACK
    console.log('Trying Final Fallback Model:', FINAL_FALLBACK_MODEL);
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEYS[0] || DEFAULT_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Prompt Studio'
            },
            body: JSON.stringify({
                model: FINAL_FALLBACK_MODEL,
                messages: [{ role: "user", content: system ? `${system}\n\n${prompt}` : prompt }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Final Fallback Model succeeded!');
            const generatedText = data.choices[0].message.content || 'No content generated';
            promptCache.set(normalizedPrompt, generatedText);
            enforceCacheLimit();
            console.log('✅ Serving from Live Model:', FINAL_FALLBACK_MODEL);
            return res.json({ result: generatedText });
        }
    } catch (err) {
        console.error('❌ Final Fallback Model failed:', err.message);
    }

    // If we reach here, all models failed
    console.error('❌ All models failed.');
    res.status(500).json({ error: `All models including fallback failed. Last error: ${lastError}` });
});

app.use(express.static('.'));
app.listen(3000, () => console.log('✅ Server running at http://localhost:3000'));
