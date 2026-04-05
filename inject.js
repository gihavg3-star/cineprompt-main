const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
const newHtml = html.replace('__GEMINI_KEY__', apiKey);
fs.writeFileSync('index.html', newHtml);
console.log('✅ Key injected');