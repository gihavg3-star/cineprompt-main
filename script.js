/**
 * Prompt Studio - Global Search Engine & Navigation Logic
 */

const API_URL = '/api/generate';

function handleSearchClick() {
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('global-search-input');
    
    if (!searchContainer.classList.contains('expanded')) {
        // Toggle open if closed
        searchContainer.classList.add('expanded');
        searchInput.focus();
    } else {
        // Execute search if already open
        globalSearch(searchInput.value);
    }
}

function globalSearch(query) {
    query = query.toLowerCase().trim();
    if (!query) {
        currentSearchQuery = "";
        // Reset visibility of all elements
        document.querySelectorAll('.feature-card, .category-card, .sub-tool-item').forEach(el => {
            el.classList.remove('hidden');
            el.classList.remove('search-match');
            el.classList.remove('search-dim');
        });
        renderPrompts();
        if (window.renderHistoryUI) window.renderHistoryUI();
        return;
    }

    // Site section navigation and scrolling
    const sections = {
        'home': 'view-home',
        'hub': 'view-hub',
        'generator': 'view-generator',
        'library': 'view-prompts',
        'builder': 'view-builder',
        'improver': 'view-improver',
        'history': 'history-sidebar',
        'community': 'view-community',
        'dev': 'view-dev',
        'faq': 'faq-section'
    };

    for (const key in sections) {
        if (query === key || query.includes('go to ' + key) || query.includes('open ' + key)) {
            if (key === 'history') {
                toggleHistorySidebar();
            } else if (key === 'faq') {
                if (currentPage !== 'home') navigateTo('home');
                setTimeout(() => {
                    document.getElementById('faq-section').scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                const viewName = sections[key].replace('view-', '');
                navigateTo(viewName);
            }
            showToast(`Navigating to ${key}...`);
            return;
        }
    }

    // Filter logic
    currentSearchQuery = query;
    let foundAny = false;

    // 1. Filter Home Feature Cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        const text = card.innerText.toLowerCase();
        if (text.includes(query)) {
            card.classList.remove('hidden');
            foundAny = true;
        } else {
            card.classList.add('hidden');
        }
    });

    // 2. Filter Services Hub Categories & Tools
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        const cardText = card.innerText.toLowerCase();
        const subTools = card.querySelectorAll('.sub-tool-item');
        let cardHasMatch = false;

        subTools.forEach(tool => {
            const toolText = tool.innerText.toLowerCase();
            if (toolText.includes(query)) {
                tool.classList.add('search-match');
                tool.classList.remove('hidden');
                cardHasMatch = true;
                foundAny = true;
            } else {
                tool.classList.remove('search-match');
                // Don't hide sub-tools yet if card matches, but let's highlight them
            }
        });

        if (cardText.includes(query) || cardHasMatch) {
            card.classList.add('search-match');
            card.classList.remove('search-dim');
            card.classList.remove('hidden');
            foundAny = true;
        } else {
            card.classList.remove('search-match');
            card.classList.add('search-dim');
        }
    });

    // 3. Filter Free Library
    renderPrompts();
    const libraryGrid = document.getElementById('prompts-grid');
    if (libraryGrid && libraryGrid.children.length > 0) foundAny = true;

    // 4. Filter History Sidebar
    if (window.renderHistoryUI) window.renderHistoryUI();
    const historyContainer = document.getElementById('history-cards-container');
    if (historyContainer && !historyContainer.querySelector('.history-empty-state')) foundAny = true;

    // 5. Filter Community Feed
    renderCommunity();
    const communityFeed = document.getElementById('community-feed');
    if (communityFeed && communityFeed.children.length > 0) foundAny = true;

    if (!foundAny) {
        showToast('No prompts found for this search');
    } else {
        showToast(`Search results for: ${query}`);
        // If on Hub, highlight is enough. If elsewhere, maybe stay there.
    }
}

/**
 * Unified Services Hub - Dynamic Workspace Logic
 */

const TOOL_TEMPLATES = {
    'Image Prompt Generator': {
        icon: 'fa-image',
        category: 'image',
        desc: 'Craft high-fidelity image prompts with technical parameter control.',
        placeholder: 'Describe the scene, subject, or atmosphere...',
        buttonText: 'Generate Image Prompt',
        optionsHtml: `
            <div class="flex flex-col gap-2">
                <label class="text-sm font-bold opacity-70">Aspect Ratio:</label>
                <select id="option-aspect-ratio" class="tool-option-select">
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Widescreen</option>
                    <option value="9:16">9:16 Vertical</option>
                    <option value="4:5">4:5 Social Media</option>
                </select>
            </div>
            <div class="flex flex-col gap-2">
                <label class="text-sm font-bold opacity-70">Art Style:</label>
                <select id="option-style" class="tool-option-select">
                    <option value="cinematic">Cinematic</option>
                    <option value="digital-art">Digital Art</option>
                    <option value="photography">Photography</option>
                    <option value="3d-render">3D Render</option>
                    <option value="anime">Anime</option>
                </select>
            </div>
        `
    },
    'AI Text Detector': {
        icon: 'fa-file-shield',
        category: 'text',
        desc: 'Analyze text to identify patterns characteristic of AI language models.',
        placeholder: 'Paste the text you want to analyze...',
        buttonText: 'Scan for AI Patterns',
        optionsHtml: `
            <div class="flex flex-col gap-2">
                <label class="text-sm font-bold opacity-70">Scan Depth:</label>
                <select id="option-scan-depth" class="tool-option-select">
                    <option value="standard">Standard Scan</option>
                    <option value="deep">Deep Analysis</option>
                </select>
            </div>
        `
    },
    'Product Descriptions': {
        icon: 'fa-cart-shopping',
        category: 'ecommerce',
        desc: 'Generate persuasive, conversion-focused product descriptions.',
        placeholder: 'List product features, benefits, or specifications...',
        buttonText: 'Generate Product Copy',
        optionsHtml: `
            <div class="flex flex-col gap-2">
                <label class="text-sm font-bold opacity-70">Target Audience:</label>
                <input type="text" id="option-audience" class="tool-option-select" placeholder="e.g. Young professionals, gamers...">
            </div>
            <div class="flex flex-col gap-2">
                <label class="text-sm font-bold opacity-70">Tone of Voice:</label>
                <select id="option-tone" class="tool-option-select">
                    <option value="professional">Professional</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="luxury">Luxury</option>
                    <option value="minimalist">Minimalist</option>
                </select>
            </div>
        `
    },
    'Merge Images': {
        icon: 'fa-images',
        category: 'image',
        desc: 'Combine multiple image descriptions into a single cohesive scene prompt.',
        placeholder: 'Describe image 1, image 2, etc. (one per line)...',
        buttonText: 'Merge to Unified Prompt',
        optionsHtml: `
            <div class="flex flex-col gap-2">
                <label class="text-sm font-bold opacity-70">Composition Style:</label>
                <select id="option-composition" class="tool-option-select">
                    <option value="blended">Seamless Blend</option>
                    <option value="split">Split Screen</option>
                    <option value="collage">Collage Style</option>
                </select>
            </div>
        `
    },
    'Image-to-Prompt': {
        icon: 'fa-wand-magic-sparkles',
        category: 'image',
        desc: 'Describe an image in detail to extract its stylistic and technical prompt components.',
        placeholder: 'Describe the image you want to reverse-engineer...',
        buttonText: 'Extract Prompt Details',
        optionsHtml: `
            <div class="flex flex-col gap-2">
                <label class="text-sm font-bold opacity-70">Detail Level:</label>
                <select id="option-detail" class="tool-option-select">
                    <option value="standard">Standard</option>
                    <option value="technical">Technical Focus</option>
                    <option value="artistic">Artistic Focus</option>
                </select>
            </div>
        `
    }
};

function openTool(toolId, category) {
    // Map ID back to display name for template lookup
    const toolNameMap = {
        'generate-prompts': 'Generate Prompts',
        'check-prompts': 'Check Prompts',
        'ai-text-detector': 'AI Text Detector',
        'human-rewriting': 'Human Rewriting',
        'image-prompt-generator': 'Image Prompt Generator',
        'gemini-image-prompts': 'Gemini Image Prompts',
        'image-to-prompt': 'Image-to-Prompt',
        'merge-images': 'Merge Images',
        'video-script-generator': 'Video Scripting',
        'scene-breakdown': 'Scene Breakdown',
        'product-descriptions': 'Product Descriptions',
        'ad-copy-generator': 'Ad Generator',
        'email-campaigns': 'Email Campaigns',
        'social-media-strategy': 'Social Strategy',
        'ui-ux-copy': 'UI/UX Copy',
        'color-palette-prompts': 'Color Palettes'
    };

    const toolName = toolNameMap[toolId] || toolId;
    
    const mainView = document.getElementById('hub-main-view');
    const workspace = document.getElementById('hub-workspace');
    const title = document.getElementById('workspace-tool-title');
    const desc = document.getElementById('workspace-tool-desc');
    const iconContainer = document.getElementById('workspace-tool-icon');
    const inputField = document.getElementById('workspace-input');
    const genBtn = document.getElementById('workspace-gen-btn');
    const optionsContainer = document.getElementById('tool-specific-options');
    const resultContainer = document.getElementById('workspace-result-container');
    const resultText = document.getElementById('workspace-result-text');

    const template = TOOL_TEMPLATES[toolName] || {
        icon: 'fa-microchip',
        category: category,
        desc: `Professional AI-powered assistant for ${toolName}.`,
        placeholder: `Enter your ${toolName.toLowerCase()} input here...`,
        buttonText: 'Execute Tool',
        optionsHtml: ''
    };

    // Update tool info
    title.innerText = toolName;
    desc.innerText = template.desc;
    inputField.value = '';
    inputField.placeholder = template.placeholder;
    genBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${template.buttonText}`;
    optionsContainer.innerHTML = template.optionsHtml;
    resultContainer.classList.add('hidden');
    resultText.innerText = '';
    iconContainer.innerHTML = `<i class="fa-solid ${template.icon}"></i>`;

    // Update URL state for SPA
    window.location.hash = `services/${toolId}`;

    // Transitions: Scale-out Hub, Fade-in Workspace
    mainView.classList.add('hub-scale-out');
    
    setTimeout(() => {
        mainView.classList.add('hidden');
        workspace.classList.remove('hidden');
        workspace.offsetHeight; 
        workspace.classList.add('workspace-fade-in');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);

    genBtn.onclick = () => executeHubTool(toolName);
}

function closeTool() {
    const mainView = document.getElementById('hub-main-view');
    const workspace = document.getElementById('hub-workspace');

    workspace.classList.remove('workspace-fade-in');
    
    setTimeout(() => {
        workspace.classList.add('hidden');
        mainView.classList.remove('hidden');
        // Force reflow
        mainView.offsetHeight;
        mainView.classList.remove('hub-scale-out');
        window.location.hash = 'hub';
    }, 300);
}

// Handle browser back/forward buttons for Hub tools
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash === '#hub' || hash === '') {
        if (!document.getElementById('hub-workspace').classList.contains('hidden')) {
            closeTool();
        }
    } else if (hash.startsWith('#services/')) {
        const slug = hash.replace('#services/', '');
        // Find tool by slug
        for (const name in TOOL_TEMPLATES) {
            if (name.toLowerCase().replace(/ /g, '-') === slug) {
                if (document.getElementById('hub-workspace').classList.contains('hidden')) {
                    openTool(name, TOOL_TEMPLATES[name].category);
                }
                break;
            }
        }
    }
});

/**
 * Unified Services Hub - Execution & Result Logic
 */

// --- CACHE SYSTEM ---
async function fetchDataWithCache(payload) {
    const cacheKey = `api_cache_${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`.substring(0, 100);
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_time`);
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Check if cache exists and is still fresh
    if (cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp) < CACHE_DURATION)) {
        console.log("FETCHING FROM CACHE... Success!");
        return JSON.parse(cachedData);
    }

    // If no cache or expired, fetch from API
    console.log("Cache miss. FETCHING FROM API...");
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        throw new Error(data?.error || `API Error: ${response.status}`);
    }

    if (!data.result) {
        throw new Error("Invalid API response format (missing 'result' field)");
    }

    // Store in Cache
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

    return data;
}

async function executeHubTool(toolName) {
    const input = document.getElementById('workspace-input').value.trim();
    if (!input) return showToast("Enter an idea first");

    const loading = document.getElementById('workspace-loading');
    const resultBox = document.getElementById('workspace-result-container');
    const resultText = document.getElementById('workspace-result-text');
    const btn = document.getElementById('workspace-gen-btn');

    loading.classList.remove('hidden');
    resultBox.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

    console.log(`🚀 Executing ${toolName} with input:`, input);

    let finalOutput = "";
    let systemPrompt = `You are an expert at ${toolName}. Help the user with their request.`;
    let userPrompt = input;
    
    // Tool-Specific Prompt Construction
    if (toolName === 'Image Prompt Generator') {
        const ratio = document.getElementById('option-aspect-ratio')?.value || '1:1';
        const style = document.getElementById('option-style')?.value || 'cinematic';
        userPrompt = `Generate a high-detail ${style} image prompt for: ${input}. Ensure it includes professional lighting and 8k resolution keywords. Add aspect ratio parameter: --ar ${ratio}`;
    } 
    else if (toolName === 'AI Text Detector') {
        const depth = document.getElementById('option-scan-depth')?.value || 'standard';
        userPrompt = `Analyze the following text for AI patterns using a ${depth} scan depth. Provide a probability score and brief analysis: ${input}`;
    } 
    else if (toolName === 'Product Descriptions') {
        const audience = document.getElementById('option-audience')?.value || 'general consumers';
        const tone = document.getElementById('option-tone')?.value || 'professional';
        userPrompt = `Write a conversion-focused product description for: ${input}. Target Audience: ${audience}. Tone: ${tone}.`;
    } 

    try {
        const data = await fetchDataWithCache({ 
            prompt: userPrompt, 
            system: systemPrompt 
        });
        
        if (data.result) {
            finalOutput = data.result;
        }
    } catch (err) {
        console.error("❌ API Error:", err);
        finalOutput = `Error: ${err.message}. Please ensure the backend server is running and accepting POST requests at ${API_URL}.`;
    }

    // Display Result with Typewriter Effect
    loading.classList.add('hidden');
    resultBox.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${TOOL_TEMPLATES[toolName]?.buttonText || 'Execute Tool'}`;
    
    typeWriter(finalOutput, resultText);
    
    console.log('Attempting to save to history...'); // For debugging 
    const promptToSave = document.getElementById('workspace-input')?.value || "Unknown Prompt"; 
    if (window.saveToHistory) {
        window.saveToHistory(promptToSave, finalOutput); 
    } else {
        console.error("window.saveToHistory is not defined!");
    }
    console.log('Save function triggered for:', promptToSave); 
}

function typeWriter(text, element) {
    element.innerText = "";
    let i = 0;
    const speed = 15; // ms per character
    
    function type() {
        if (i < text.length) {
            element.innerText += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}


/**
 * Feature Cards - Interactivity & Simulation Logic
 */

function toggleExportModal(show) {
    const modal = document.getElementById('export-modal');
    if (!modal) return;
    
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        }, 10);
    } else {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
    document.body.style.overflow = show ? 'hidden' : 'auto';
}

function simulateDownload(format) {
    showToast(`Generating ${format} file...`);
    setTimeout(() => {
        showToast(`${format} download started!`);
        toggleExportModal(false);
    }, 1500);
}

function activateOneClickGen() {
    navigateTo('improver');
    setTimeout(() => {
        const input = document.getElementById('improver-input');
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showToast("Ready for One-Click Generation!");
        }
    }, 300);
}

function activateAIEnhancement() {
    showToast("Initializing AI Scan...");
    // Create a temporary overlay for scanning effect
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-500 opacity-0';
    overlay.innerHTML = `
        <div class="flex flex-col items-center gap-6">
            <div class="w-24 h-24 rounded-full border-4 border-t-[var(--primary)] border-r-transparent border-b-[var(--secondary)] border-l-transparent animate-spin"></div>
            <p class="text-2xl font-black text-white tracking-widest uppercase animate-pulse">Scanning System...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Fade in
    setTimeout(() => overlay.style.opacity = '1', 10);
    
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(overlay);
            navigateTo('hub');
            showToast("AI Enhancement Active in Services Hub!");
            
            // Highlight the hub section
            const hub = document.getElementById('view-hub');
            if (hub) {
                hub.classList.add('neon-border');
                setTimeout(() => hub.classList.remove('neon-border'), 2000);
            }
        }, 500);
    }, 2500);
}

/**
 * Footer & Navigation Logic
 */

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateToImprover() {
    navigateTo('improver');
    setTimeout(() => {
        const input = document.getElementById('raw-prompt-input');
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}

function scrollToFAQ() {
    if (currentPage !== 'home') navigateTo('home');
    setTimeout(() => {
        const faq = document.getElementById('faq-section');
        if (faq) faq.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}

function handleSocialClick(platform) {
    showToast(`Follow us soon! Our ${platform} community is under construction 🚀`);
}

function toggleContactModal(show) {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        }, 10);
    } else {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
    document.body.style.overflow = show ? 'hidden' : 'auto';
}

function toggleLegalModal(show) {
    const modal = document.getElementById('legal-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        }, 10);
    } else {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
    document.body.style.overflow = show ? 'hidden' : 'auto';
}

function openLegalModal(type) {
    const title = document.getElementById('legal-modal-title');
    const content = document.getElementById('legal-modal-content');
    
    if (type === 'privacy') {
        title.innerText = 'Privacy Policy';
        content.innerHTML = `
            <p><strong>1. Information Collection:</strong> We collect minimal data to provide our prompt engineering services. This includes your email if you choose to sign up.</p>
            <p><strong>2. Data Usage:</strong> Your prompts and inputs are used solely for generation and are not sold to third parties.</p>
            <p><strong>3. Security:</strong> We implement industry-standard security measures to protect your information.</p>
            <p><strong>4. Cookies:</strong> We use essential cookies to maintain your session and preferences.</p>
        `;
    } else if (type === 'terms') {
        title.innerText = 'Terms of Service';
        content.innerHTML = `
            <p><strong>1. Acceptance:</strong> By using Prompt Studio, you agree to these terms.</p>
            <p><strong>2. Usage:</strong> You are responsible for the prompts you generate and their outputs.</p>
            <p><strong>3. Prohibited Content:</strong> Do not use the platform to generate illegal or harmful content.</p>
            <p><strong>4. Intellectual Property:</strong> The platform and its original content are owned by Prompt Studio Pro.</p>
        `;
    }
    
    toggleLegalModal(true);
}

// Event Listeners for Search & Hub Tools
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('global-search-input');

    // Navbar Search
    if (searchBtn) searchBtn.addEventListener('click', handleSearchClick);
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') globalSearch(searchInput.value);
        });
    }

    // Hub Sub-tool Buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.sub-tool-btn');
        if (btn) {
            const toolId = btn.getAttribute('data-tool-id');
            const category = btn.closest('.category-card').getAttribute('data-category');
            
            // Visual Feedback: Pulse effect
            btn.classList.add('tool-pulse');
            setTimeout(() => {
                btn.classList.remove('tool-pulse');
                openTool(toolId, category);
            }, 300);
        }
    });

    if (window.renderHistoryUI) window.renderHistoryUI();
});

// Local Storage History System 
window.saveToHistory = function(promptText, resultText) { 
    let history = JSON.parse(localStorage.getItem('promptHistory')) || []; 
    history.unshift({ 
        prompt: promptText || "بدون عنوان", 
        result: resultText || "", 
        date: new Date().toLocaleString() 
    }); 
    if(history.length > 20) history.pop(); 
    localStorage.setItem('promptHistory', JSON.stringify(history)); 
    if (typeof window.renderHistoryUI === 'function') { 
        window.renderHistoryUI(); 
    } 
}; 

window.renderHistoryUI = function() { 
    const container = document.querySelector('#history-cards-container'); 
    if (!container) return; 
    const history = JSON.parse(localStorage.getItem('promptHistory')) || []; 
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const t = window.translations[lang] || window.translations.en;
    
    if (history.length === 0) { 
        container.innerHTML = `<p style="text-align:center; color:#666; padding:20px;">${t.history_empty}</p>`; 
        return; 
    } 

    container.innerHTML = history.map((item, index) => {
        const encodedResult = btoa(unescape(encodeURIComponent(item.result || ""))); 
        return ` 
        <div class="history-card" style="background:#1a1a1a; border:1px solid #333; padding:12px; border-radius:10px; margin-bottom:12px; position:relative;"> 
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"> 
                <span style="color:#00d4ff; font-size:11px; font-weight:bold;">${item.date}</span> 
                <div style="display:flex; gap:12px; align-items:center;"> 
                    <button onclick="handleHistoryCopy('${encodedResult}')" style="background:none; border:none; color:#888; cursor:pointer;" title="${t.copy_result}"> 
                        <i class="fas fa-copy"></i> 
                    </button> 
                    <button onclick="deleteHistoryItem(${index})" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:16px;" title="${t.delete_item}"> 
                        <i class="fas fa-times"></i> 
                    </button> 
                </div> 
            </div> 
            <p style="color:#ffffff; font-size:13px; margin:0; line-height:1.4; font-weight:500;"> 
                ${item.prompt ? (item.prompt.length > 60 ? item.prompt.substring(0, 60) + '...' : item.prompt) : t.history_no_title} 
            </p> 
        </div> 
    `}).join(''); 
}; 

window.handleHistoryCopy = function(encodedStr) { 
    const decodedStr = decodeURIComponent(escape(atob(encodedStr))); 
    window.copyToClipboard(decodedStr); 
};

window.deleteHistoryItem = function(index) { 
    let history = JSON.parse(localStorage.getItem('promptHistory')) || []; 
    history.splice(index, 1); 
    localStorage.setItem('promptHistory', JSON.stringify(history)); 
    window.renderHistoryUI(); 
};

/**
 * i18n Translation Logic
 */
window.changeLanguage = function(lang) {
    localStorage.setItem('preferredLanguage', lang);
    const t = window.translations[lang];
    if (!t) return;

    // Update layout direction
    document.body.dir = (lang === 'ar') ? 'rtl' : 'ltr';

    // Update elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });

    // Update the language button text to the active language name
    const langBtnText = document.getElementById('current-lang-text');
    if (langBtnText && t['lang_' + lang]) {
        langBtnText.textContent = t['lang_' + lang];
    }

    // Refresh dynamic UI components
    window.renderHistoryUI();
};

// وظيفة فتح وإغلاق القائمة
document.addEventListener('DOMContentLoaded', () => { 
    // JavaScript // Force-remove any old listeners 
    const oldBtn = document.getElementById('lang-toggle-btn'); 
    if (oldBtn) {
        const newBtn = oldBtn.cloneNode(true); 
        oldBtn.parentNode.replaceChild(newBtn, oldBtn); 
        
        newBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            const menu = document.getElementById('lang-dropdown-menu'); 
            const isVisible = menu.style.display === 'block'; 
            menu.style.display = isVisible ? 'none' : 'block'; 
            console.log("Language Menu Toggled: " + !isVisible); 
        }); 
    }
    
    document.addEventListener('click', () => { 
        const menu = document.getElementById('lang-dropdown-menu');
        if (menu) menu.style.display = 'none'; 
    }); 

    // Initial language setup
    const initialLang = localStorage.getItem('preferredLanguage') || 'en';
    window.changeLanguage(initialLang);
}); 