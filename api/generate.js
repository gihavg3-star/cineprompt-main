// Vercel Edge Runtime Configuration (Non-Next.js)
export const config = {
    runtime: 'edge'
};

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

const API_KEYS = [
    process.env.OPENROUTER_API_KEY,
    process.env.API_KEY_1, process.env.API_KEY_2, process.env.API_KEY_3, process.env.API_KEY_4,
    process.env.API_KEY_5, process.env.API_KEY_6, process.env.API_KEY_7, process.env.API_KEY_8,
    process.env.API_KEY_9, process.env.API_KEY_10, process.env.API_KEY_11, process.env.API_KEY_12,
    process.env.API_KEY_13, process.env.API_KEY_14, process.env.API_KEY_15, process.env.API_KEY_16,
    process.env.API_KEY_17, process.env.API_KEY_18, process.env.API_KEY_19, process.env.API_KEY_20
].filter(key => key && key.trim() !== "");

// Vercel Edge Function Default Export
export default async function handler(req) {
    // 1. Explicitly check for POST method
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { prompt, system, stream: streamRequested } = body;

        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
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
                        messages: [{ role: "user", content: system ? `${system}\n\n${prompt}` : prompt }],
                        stream: !!streamRequested
                    })
                });

                if (response.ok) {
                    if (streamRequested) {
                        const encoder = new TextEncoder();
                        const decoder = new TextDecoder();
                        
                        const stream = new ReadableStream({
                            async start(controller) {
                                const reader = response.body.getReader();
                                let buffer = "";
                                
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;
                                    
                                    buffer += decoder.decode(value, { stream: true });
                                    const lines = buffer.split('\n');
                                    buffer = lines.pop();
                                    
                                    for (const line of lines) {
                                        const trimmed = line.trim();
                                        if (!trimmed || trimmed === 'data: [DONE]') continue;
                                        if (trimmed.startsWith('data: ')) {
                                            try {
                                                const data = JSON.parse(trimmed.slice(6));
                                                const content = data.choices[0]?.delta?.content || '';
                                                if (content) controller.enqueue(encoder.encode(content));
                                            } catch (e) {}
                                        }
                                    }
                                }
                                controller.close();
                            }
                        });
                        
                        return new Response(stream, {
                            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                        });
                    } else {
                        const data = await response.json();
                        const generatedText = data.choices[0]?.message?.content || 'No content generated';
                        return new Response(JSON.stringify({ result: generatedText }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
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

        return new Response(JSON.stringify({ error: `All models failed. Last error: ${lastError}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: `Server error: ${err.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
