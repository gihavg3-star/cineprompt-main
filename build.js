const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set');
    process.exit(1);
}

const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace('GEMINI_API_KEY_PLACEHOLDER', apiKey);
fs.writeFileSync(indexPath, html);
console.log('✅ API key injected into index.html');