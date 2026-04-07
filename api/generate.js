// Vercel Node.js Runtime Configuration
export const config = {
    runtime: 'nodejs'
};

const PROVIDERS = [
    {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: process.env.API_KEY_1,
        model: 'qwen/qwen-2.5-72b-instruct:free'
    },
    {
        name: 'Groq_1',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.API_KEY_2,
        model: 'llama-3.3-70b-versatile'
    },
    {
        name: 'Groq_2',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.API_KEY_3,
        model: 'llama-3.3-70b-versatile'
    }
];

export default async function handler(req) {
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

        // API Rotation Loop
        for (const provider of PROVIDERS) {
            if (!provider.apiKey) continue;

            console.log(`Trying Provider: ${provider.name}...`);

            try {
                const response = await fetch(provider.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${provider.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://promptstudio.pro',
                        'X-Title': 'Prompt Studio'
                    },
                    body: JSON.stringify({
                        model: provider.model,
                        messages: [
                            { role: "system", content: system || "You are a professional prompt engineer." },
                            { role: "user", content: prompt }
                        ],
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
                                        
                                        // Both OpenRouter and Groq use OpenAI compatible SSE format
                                        if (trimmed.startsWith('data: ')) {
                                            try {
                                                const data = JSON.parse(trimmed.slice(6));
                                                const content = data.choices[0]?.delta?.content || '';
                                                if (content) controller.enqueue(encoder.encode(content));
                                            } catch (e) {
                                                // Silent catch for partial JSON chunks
                                            }
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
                    const errorData = await response.text();
                    lastError = `Provider ${provider.name} failed (${response.status}): ${errorData}`;
                    console.warn(lastError);
                    
                    // If rate limited or server error, continue to next provider
                    if (response.status === 429 || response.status >= 500) {
                        continue;
                    } else {
                        // For 400/401 errors, stop and report
                        return new Response(JSON.stringify({ error: lastError }), {
                            status: response.status,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
            } catch (err) {
                lastError = `Fetch error with ${provider.name}: ${err.message}`;
                console.error(lastError);
                continue;
            }
        }

        return new Response(JSON.stringify({ error: `All API keys failed. Last error: ${lastError}` }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: `Critical Server Error: ${err.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
