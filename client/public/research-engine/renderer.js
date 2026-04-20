// SchmoCo Research Engine - Modular Architecture
// Desktop App with Gemini AI Integration - NotebookLM-style 3-Panel Layout

// ============================================
// MODULE: API Handler
// Handles all external API calls (Gemini, web search, etc.)
// ============================================
const API = {
  async getGeminiKey() {
    return localStorage.getItem('geminiApiKey');
  },

  async setGeminiKey(key) {
    const cleaned = key.trim().replace(/^(api\s*key\s*[:\-]?\s*)/i, '');
    localStorage.setItem('geminiApiKey', cleaned);
  },

  async getTavilyKey() {
    return localStorage.getItem('tavilyApiKey');
  },

  async setTavilyKey(key) {
    localStorage.setItem('tavilyApiKey', key.trim());
  },

  async getElevenLabsKey() {
    return localStorage.getItem('elevenLabsApiKey');
  },

  async setElevenLabsKey(key) {
    localStorage.setItem('elevenLabsApiKey', key.trim());
  },

  async getTtsProvider() {
    return localStorage.getItem('ttsProvider');
  },

  async setTtsProvider(provider) {
    localStorage.setItem('ttsProvider', provider);
  },

  async gemini(prompt) {
    const apiKey = await this.getGeminiKey();
    if (!apiKey) {
      UI.openModal('settingsModal');
      throw new Error('Gemini API key not configured. Open Settings to add one.');
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      })
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  async webSearch(query, sourceType, numResults) {
    try {
      const response = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tavily-key': await this.getTavilyKey() || ''
        },
        body: JSON.stringify({ query, sourceType, numResults })
      });
      return await response.json();
    } catch (e) {
      console.error('Web search failed:', e);
      return { success: false, error: e.message };
    }
  },

  async fetchUrl(url) {
    try {
      const response = await fetch('/api/research/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      return await response.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

// ============================================
// MODULE: Config
// Central configuration for easy modification
// ============================================
const CONFIG = {
  // UI Settings
  sourceCountOptions: [5, 10, 15, 20, 25, 50],
  defaultSourceCount: 10,
  
  // Academic domains for filtering
  academicDomains: [
    'pewresearch.org', 'openalex.org', 'semanticscholar.org', 'doaj.org',
    'scholar.archive.org', 'base-search.net', 'core.ac.uk', 'arxiv.org',
    'ncbi.nlm.nih.gov', 'jstor.org', 'researchgate.net', 'ssrn.com',
    'mit.edu', 'harvard.edu', 'stanford.edu', 'berkeley.edu'
  ],
  
  // Source type icons
  sourceIcons: {
    PDF: '📕', WEB: '🌐', YOUTUBE: '🎬', TEXT: '📝',
    GOOGLE: '📁', KNOWLEDGE_TREE: '🌱', ACADEMIC: '🎓'
  },
  
  // Generation types
  generationTypes: {
    summary: { label: 'Summary', icon: '📝', prompt: 'Create a comprehensive summary' },
    'study-guide': { label: 'Study Guide', icon: '📚', prompt: 'Create a study guide with key concepts' },
    briefing: { label: 'Briefing Doc', icon: '📋', prompt: 'Create a professional briefing document' },
    mindmap: { label: 'Mind Map', icon: '🗺️', prompt: 'Create a mind map in Mermaid syntax' },
    timeline: { label: 'Timeline', icon: '📅', prompt: 'Extract dates and create a timeline' },
    faq: { label: 'FAQ', icon: '❓', prompt: 'Create frequently asked questions and answers' }
  },
  
  // Knowledge Tree settings
  knowledgeTree: {
    maxSubTopics: 7,
    maxContentLength: 8000
  }
};

// ============================================
// MODULE: Storage
// Handles all data persistence
// ============================================
const Storage = {
  async loadNotebooks() {
    const stored = localStorage.getItem('schmoco-notebooks');
    return stored ? JSON.parse(stored) : [];
  },

  saveNotebooks(notebooks) {
    localStorage.setItem('schmoco-notebooks', JSON.stringify(notebooks));
  },

  createNotebook(name) {
    return {
      id: Date.now().toString(),
      name: name,
      sources: [],
      chatHistory: [],
      createdAt: Date.now()
    };
  }
};

// ============================================
// MODULE: Source Discovery
// Handles finding and importing sources from web
// ============================================
const SourceDiscovery = {
  discovered: [],
  
  async search(topic, sourceType, count, setStatus) {
    setStatus = setStatus || (() => {});

    // Request extra candidates so filtering still yields enough results
    const wantRaw = Math.min(count * 3, 40);
    setStatus('Searching for candidates…');

    let candidates = [];
    const webResult = await API.webSearch(topic, sourceType, wantRaw);
    if (webResult.success && webResult.results?.length) {
      candidates = webResult.results;
    } else {
      candidates = await this._geminiCandidates(topic, sourceType, wantRaw);
    }
    if (!candidates.length) return false;

    // Always fetch the raw HTML and run our own extractor — Tavily's plain-text
    // raw_content is noisy (nav, ads, footers mixed in). Our HTML parser finds
    // <article>/<main>, strips structural junk, and produces much cleaner text.
    const qualified = [];
    for (let i = 0; i < candidates.length; i++) {
      if (qualified.length >= count) break;
      setStatus(`Checking ${i + 1} / ${candidates.length}  ·  ${qualified.length} qualified…`);
      try {
        const res = await API.fetchUrl(candidates[i].url);
        if (!res.success || !res.content) continue;
        const text = this.extractText(res.content);
        if (text.trim().split(/\s+/).length < 500) continue;
        qualified.push({ ...candidates[i], content: text });
      } catch (_) {}
    }

    this.discovered = qualified;
    return qualified.length > 0;
  },

  async _geminiCandidates(topic, sourceType, count) {
    const filter = sourceType === 'academic-only'
      ? `Only include sources from: ${CONFIG.academicDomains.join(', ')}`
      : 'Include academic, news, and official sources';
    const prompt = `Find ${count} high-quality sources about "${topic}". ${filter}
Return as JSON array: [{"title":"...","url":"...","description":"...","sourceType":"academic|official|news|web"}]`;
    try {
      const result = await API.gemini(prompt);
      const match = result.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]).filter(s => s.title && s.url);
    } catch (_) {}
    return [];
  },

  renderResults() {
    const container = document.getElementById('discoverResults');
    if (!this.discovered.length) {
      container.innerHTML = '<p style="text-align: center;">No sources found</p>';
      return;
    }
    
    container.innerHTML = this.discovered.map((r, i) => `
      <div class="discover-result">
        <input type="checkbox" id="discover-${i}" checked>
        <div class="discover-result-info">
          <h4>${r.title}</h4>
          <p>${r.description || ''}</p>
          <span class="discover-result-source">${r.url}</span>
        </div>
      </div>
    `).join('');
    
    document.getElementById('importSelectedBtn').disabled = false;
  },

  async importSelected() {
    const selected = this.discovered.filter((_, i) =>
      document.getElementById(`discover-${i}`)?.checked
    );
    if (!selected.length) { alert('No sources selected. Check at least one source to import.'); return; }
    if (!App.currentNotebook) { alert('No notebook selected. Please create or open a notebook first.'); return; }

    const btn = document.getElementById('importSelectedBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }

    try {
      // Content already fetched and filtered during search — just dedup and push
      const existingUrls   = new Set(App.currentNotebook.sources.map(s => s.url?.toLowerCase()).filter(Boolean));
      const existingTitles = new Set(App.currentNotebook.sources.map(s => s.name?.toLowerCase()).filter(Boolean));
      let imported = 0, skipped = 0;

      for (const r of selected) {
        const url   = r.url?.toLowerCase();
        const title = r.title?.toLowerCase();
        if ((url && existingUrls.has(url)) || (title && existingTitles.has(title))) { skipped++; continue; }
        if (url)   existingUrls.add(url);
        if (title) existingTitles.add(title);
        App.currentNotebook.sources.push({
          name: r.title, type: 'WEB', url: r.url,
          content: r.content, summary: '', keyPoints: [], addedAt: Date.now()
        });
        imported++;
      }

      Storage.saveNotebooks(App.notebooks);
      App.renderSources();
      UI.closeModal('discoverModal');
      const skipNote = skipped > 0 ? ` (${skipped} skipped — already imported)` : '';
      UI.showSuccess(`Imported ${imported} source${imported !== 1 ? 's' : ''}${skipNote}`);
    } catch (e) {
      UI.showContent(`<div class="generated-content"><h3>⚠️ Import failed</h3><p>${e.message}</p></div>`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Import Selected'; }
    }
  },

  extractText(html) {
    // Strip noise elements entirely (including headings and metadata)
    let cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s>][\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s>][\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s>][\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s>][\s\S]*?<\/aside>/gi, '')
      .replace(/<form[\s>][\s\S]*?<\/form>/gi, '')
      .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
      .replace(/<(figcaption|caption|time|label|button|abbr)[^>]*>[\s\S]*?<\/(figcaption|caption|time|label|button|abbr)>/gi, '')
      .replace(/<[^>]+(?:class|id)="[^"]*\b(?:byline|author|dateline|breadcrumb|tag|category|related|share|social|comment|sidebar|widget|ad|advert|promo)\b[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Prefer semantic content containers
    const candidates = [
      /<article[\s>]([\s\S]*?)<\/article>/i,
      /<main[\s>]([\s\S]*?)<\/main>/i,
      /<div[^>]+(?:class|id)="[^"]*\b(?:article|post|entry|content|story|body|text)\b[^"]*"[^>]*>([\s\S]{300,}?)<\/div>/i,
    ];
    let body = '';
    for (const re of candidates) {
      const m = cleaned.match(re);
      if (m && m[1] && m[1].length > 300) { body = m[1]; break; }
    }
    if (!body) body = cleaned;

    // Preserve paragraph boundaries as newlines before stripping tags
    const plain = body
      .replace(/<\/p>|<\/div>|<\/li>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]*/g, '\n')
      .trim();

    // Post-process: strip short lines (nav remnants, labels, captions) and duplicates
    const seen = new Set();
    return plain
      .split('\n')
      .filter(line => {
        const t = line.trim();
        if (!t) return false;
        if (seen.has(t)) return false;
        seen.add(t);
        // Keep only lines with ≥ 6 words — filters out single labels, breadcrumbs, tags
        return t.split(/\s+/).length >= 6;
      })
      .join('\n')
      .substring(0, 15000);
  },

  toggleSelectAll(checked) {
    this.discovered.forEach((_, i) => {
      const cb = document.getElementById(`discover-${i}`);
      if (cb) cb.checked = checked;
    });
  }
};

// ============================================
// MODULE: Tabs
// Switches between Notebook and Knowledge Tree views
// ============================================
const Tabs = {
  current: 'notebook',
  show(tab) {
    this.current = tab;
    document.getElementById('viewNotebook').style.display = tab === 'notebook' ? 'flex' : 'none';
    document.getElementById('viewKT').style.display       = tab === 'kt'       ? 'flex' : 'none';
    document.getElementById('tabNotebook').classList.toggle('active', tab === 'notebook');
    document.getElementById('tabKnowledgeTree').classList.toggle('active', tab === 'kt');
  }
};

// ============================================
// MODULE: Knowledge Tree
// Converging graph explorer with wiki pane
// ============================================
const KnowledgeTree = {
  nodes: [],
  links: [],
  selectedId: null,
  selectedIds: new Set(),
  rootId: null,
  nextNodeId: 0,
  pan: { x: 0, y: 0 },
  scale: 1,
  simulation: null,
  _drag: false,
  _dragStart: { x: 0, y: 0 },
  _status: 'Idle',
  _stopWords: new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'vs', 'versus']),

  init() {
    const svg = document.getElementById('ktSvg');
    if (!svg) return;

    svg.addEventListener('mousedown', (e) => {
      if (e.target.closest('[data-node-id]')) return;
      this._drag = true;
      this._dragStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
      svg.style.cursor = 'grabbing';
    });

    svg.addEventListener('click', (e) => {
      const nodeEl = e.target.closest('[data-node-id]');
      if (!nodeEl) {
          this.selectedId = null;
          this.selectedIds.clear();
          this.render();
          this._renderWikiEmpty();
          return;
      }
      const id = Number(nodeEl.dataset.nodeId);
      if (Number.isNaN(id)) return;
      
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
            if (this.selectedId === id) this.selectedId = this.selectedIds.size > 0 ? Array.from(this.selectedIds)[0] : null;
        } else {
            this.selectedIds.add(id);
            this.selectedId = id;
        }
        this.render();
        if (this.selectedIds.size > 1) {
            this._renderMultiSelectWiki();
        } else if (this.selectedIds.size === 1) {
            this.focusNode(this.selectedId, false);
        } else {
            this._renderWikiEmpty();
        }
      } else {
        this.selectedIds.clear();
        this.selectedIds.add(id);
        this.selectedId = id;
        this.focusNode(id, true);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this._drag) return;
      this.pan.x = e.clientX - this._dragStart.x;
      this.pan.y = e.clientY - this._dragStart.y;
      this._applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (!this._drag) return;
      this._drag = false;
      svg.style.cursor = 'grab';
    });

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      this.scale = Math.max(0.35, Math.min(2.6, this.scale * factor));
      this._applyTransform();
    }, { passive: false });

    window.addEventListener('resize', () => {
      if (!this.nodes.length) return;
      this.render();
    });
  },

  _setStatus(text) {
    this._status = text;
    const pill = document.getElementById('ktStatusPill');
    if (pill) pill.textContent = text;
  },

  _escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _sanitizeTopic(topic) {
    return String(topic || '')
      .replace(/^[\d\-\.\)\s]+/, '')
      .replace(/\s+/g, ' ')
      .replace(/[.:;,]+$/g, '')
      .trim();
  },

  _normalizeTopic(topic) {
    return this._sanitizeTopic(topic)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\b(the|a|an|and|or|of|in|on|with|by|for)\b/g, ' ')
      .replace(/ies\b/g, 'y')
      .replace(/s\b/g, '')
      .replace(/ing\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _topicTokens(topic) {
    return this._normalizeTopic(topic)
      .split(' ')
      .filter(Boolean)
      .filter(token => !this._stopWords.has(token))
      .map(token => {
        let normalized = token
          .replace(/'s$/g, '')
          .replace(/ies$/g, 'y')
          .replace(/ses$/g, 's');
        if (normalized.length > 4 && normalized.endsWith('s')) {
          normalized = normalized.slice(0, -1);
        }
        return normalized;
      });
  },

  _topicSignature(topic) {
    return [...new Set(this._topicTokens(topic))].sort().join(' ');
  },

  findNodeByTopic(topic) {
    if (!topic) return null;
    const canonical = this._normalizeTopic(topic);
    const signature = this._topicSignature(topic);
    return this.nodes.find(node =>
      node.canonicalKey === canonical ||
      (signature && node.signature === signature)
    ) || null;
  },

  _nodeRadius(node) {
    const base = node.id === this.rootId ? 22 : node.state === 'explored' ? 16 : node.state === 'loading' ? 17 : 13;
    const connectionsBonus = Math.min((node.neighbors?.size || 0), 10) * 0.8;
    const summaryBonus = (node.summary && node.summary.length > 50) ? 2 : 0;
    return base + connectionsBonus + summaryBonus;
  },

  _stageRect() {
    const svg = document.getElementById('ktSvg');
    return svg?.getBoundingClientRect() || { width: 760, height: 520 };
  },

  _resetCamera() {
    const rect = this._stageRect();
    this.pan = { x: rect.width / 2 || 380, y: rect.height / 2 || 260 };
    this.scale = 1;
  },

  _applyTransform() {
    const g = document.getElementById('ktGraphGroup');
    if (g) g.setAttribute('transform', `translate(${this.pan.x},${this.pan.y}) scale(${this.scale})`);
  },

  resetView() {
    this._resetCamera();
    this._applyTransform();
  },

  centerOnSelection() {
    const id = this.selectedId ?? this.rootId;
    if (id === null || id === undefined) return;
    this._centerOnNode(id);
  },

  _centerOnNode(id) {
    const node = this.nodes.find(entry => entry.id === id);
    if (!node) return;
    const rect = this._stageRect();
    this.pan = {
      x: (rect.width / 2 || 380) - (node.x || 0) * this.scale,
      y: (rect.height / 2 || 260) - (node.y || 0) * this.scale
    };
    this._applyTransform();
  },

  _wrapLabel(topic) {
    const words = String(topic || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach(word => {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= 18 || !current) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    return lines.slice(0, 2);
  },

  _initialPosition(parent, index, total) {
    const angle = total <= 1
      ? Math.random() * Math.PI * 2
      : (-Math.PI / 2) + (index / Math.max(total, 1)) * Math.PI * 2;
    const distance = 145 + Math.random() * 44;
    return {
      x: (parent?.x || 0) + Math.cos(angle) * distance,
      y: (parent?.y || 0) + Math.sin(angle) * distance,
      clusterAngle: angle
    };
  },

  _createNode(topic, options = {}) {
    const cleanTopic = this._sanitizeTopic(topic);
    const signature = this._topicSignature(cleanTopic);
    const position = this._initialPosition(options.parent || null, options.index || 0, options.total || 1);
    const node = {
      id: this.nextNodeId++,
      topic: cleanTopic,
      canonicalKey: this._normalizeTopic(cleanTopic),
      signature,
      aliases: [cleanTopic],
      state: options.state || 'unexplored',
      summary: options.summary || '',
      subtopics: [],
      seenCount: 1,
      depth: options.depth || 0,
      discoveredFrom: new Set(options.parent ? [options.parent.id] : []),
      neighbors: new Set(),
      x: options.x ?? position.x,
      y: options.y ?? position.y,
      clusterAngle: options.clusterAngle ?? position.clusterAngle,
      vx: 0,
      vy: 0
    };
    this.nodes.push(node);
    return node;
  },

  _upsertLink(sourceId, targetId, type = 'related') {
    if (sourceId === targetId) return null;
    const existing = this.links.find(link => link.sourceId === sourceId && link.targetId === targetId);
    if (existing) {
      existing.count += 1;
      if (existing.type !== 'seed') existing.type = type;
      return existing;
    }
    const link = { id: `${sourceId}:${targetId}`, sourceId, targetId, type, count: 1 };
    this.links.push(link);
    const source = this.nodes.find(node => node.id === sourceId);
    const target = this.nodes.find(node => node.id === targetId);
    if (source) source.neighbors.add(targetId);
    if (target) target.neighbors.add(sourceId);
    return link;
  },

  _computeDepths() {
    if (this.rootId === null || this.rootId === undefined) return;
    const adjacency = new Map(this.nodes.map(node => [node.id, []]));
    this.links.forEach(link => {
      const list = adjacency.get(link.sourceId);
      if (list) list.push(link.targetId);
    });
    this.nodes.forEach(node => { node.depth = Number.POSITIVE_INFINITY; });
    const root = this.nodes.find(node => node.id === this.rootId);
    if (!root) return;
    root.depth = 0;
    const queue = [root.id];
    while (queue.length) {
      const current = queue.shift();
      const depth = this.nodes.find(node => node.id === current)?.depth ?? 0;
      (adjacency.get(current) || []).forEach(nextId => {
        const next = this.nodes.find(node => node.id === nextId);
        if (!next) return;
        if (depth + 1 < next.depth) {
          next.depth = depth + 1;
          queue.push(nextId);
        }
      });
    }
    this.nodes.forEach(node => {
      if (!Number.isFinite(node.depth)) node.depth = 2;
    });
  },

  _syncSimulation(reheat = 0.9) {
    if (!window.d3) {
      this.render();
      return;
    }
    if (this.simulation) this.simulation.stop();

    const rootId = this.rootId;
    this.nodes.forEach(node => {
      if (node.id === rootId) {
        node.fx = 0;
        node.fy = 0;
      } else {
        delete node.fx;
        delete node.fy;
      }
    });

    const simLinks = this.links.map(link => ({
      source: link.sourceId,
      target: link.targetId,
      count: link.count,
      type: link.type
    }));

    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(simLinks)
        .id(node => node.id)
        .distance(link => {
          const base = link.type === 'seed' ? 156 : link.type === 'convergent' ? 102 : 118;
          return base + Math.min((link.count - 1) * 12, 30);
        })
        .strength(link => link.type === 'seed' ? 0.26 : link.count > 1 ? 0.22 : 0.16)
      )
      .force('charge', d3.forceManyBody().strength(node => {
        if (node.id === rootId) return -520;
        return -220 - Math.min(node.neighbors.size * 22, 140);
      }))
      .force('collision', d3.forceCollide().radius(node => this._nodeRadius(node) + 26).iterations(2))
      .force('radial', d3.forceRadial(node => node.id === rootId ? 0 : 120 + node.depth * 74, 0, 0).strength(0.11))
      .force('x', d3.forceX(node => {
        if (node.id === rootId) return 0;
        return Math.cos(node.clusterAngle || 0) * (node.depth * 40);
      }).strength(0.03))
      .force('y', d3.forceY(node => {
        if (node.id === rootId) return 0;
        return Math.sin(node.clusterAngle || 0) * (node.depth * 40);
      }).strength(0.03))
      .alpha(Math.max(0.2, reheat))
      .alphaDecay(0.075)
      .velocityDecay(0.34)
      .on('tick', () => this.render());
  },

  _reheatSimulation(alpha = 0.35) {
    if (!this.simulation) return;
    this.simulation.alpha(Math.max(this.simulation.alpha(), alpha)).restart();
  },

  _focusMap(centerId, maxDepth = 2) {
    if (centerId === null || centerId === undefined) return new Map();
    const visited = new Map([[centerId, 0]]);
    const queue = [centerId];
    while (queue.length) {
      const current = queue.shift();
      const distance = visited.get(current) || 0;
      if (distance >= maxDepth) continue;
      const node = this.nodes.find(entry => entry.id === current);
      if (!node) continue;
      node.neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.set(neighborId, distance + 1);
          queue.push(neighborId);
        }
      });
    }
    return visited;
  },

  _relatedNodes(id) {
    const node = this.nodes.find(entry => entry.id === id);
    if (!node) return [];
    return [...node.neighbors]
      .map(neighborId => {
        const neighbor = this.nodes.find(entry => entry.id === neighborId);
        if (!neighbor) return null;
        const links = this.links.filter(link =>
          (link.sourceId === id && link.targetId === neighborId) ||
          (link.sourceId === neighborId && link.targetId === id)
        );
        const weight = links.reduce((sum, link) => sum + link.count, 0);
        const relationType = links.some(link => link.type === 'convergent') ? 'Converges here' :
          links.some(link => link.type === 'seed') ? 'Direct branch' : 'Adjacent topic';
        return { neighbor, weight, relationType };
      })
      .filter(Boolean)
      .sort((a, b) => b.weight - a.weight || b.neighbor.neighbors.size - a.neighbor.neighbors.size)
      .slice(0, 10);
  },

  async _expandTopic(topic, exclusions = []) {
    const exclusionText = exclusions.length
      ? `Avoid repeating or paraphrasing these already-connected topics: ${exclusions.join(', ')}.`
      : '';
    const prompt = `You are helping build a converging knowledge graph.

For the topic "${topic}", return ONLY valid JSON with this shape:
{"summary":"4-6 sentence wiki-style overview covering definition, why it matters, and how it connects to nearby ideas","subtopics":["topic 1","topic 2","topic 3","topic 4","topic 5","topic 6"]}

Requirements:
- The summary should be concise, factual, and readable as a knowledge article.
- The subtopics should be specific adjacent concepts worth exploring next.
- Do not return duplicates.
- Prefer concept names, not questions.
- ${exclusionText || 'Return a balanced mix of foundational and adjacent topics.'}`;

    const raw = await API.gemini(prompt);
    try {
      return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    } catch (_) {
      return { summary: raw.substring(0, 700), subtopics: [] };
    }
  },

  async start(seed) {
    const cleanSeed = this._sanitizeTopic(seed);
    if (!cleanSeed) return;
    const btn = document.getElementById('ktStartBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Exploring...';
    }

    if (this.simulation) this.simulation.stop();
    this.nodes = [];
    this.links = [];
    this.selectedId = null;
    this.selectedIds.clear();
    this.rootId = null;
    this.nextNodeId = 0;
    this._resetCamera();
    this._setStatus('Exploring seed');

    const root = this._createNode(cleanSeed, { state: 'loading', x: 0, y: 0, depth: 0, clusterAngle: 0 });
    this.rootId = root.id;
    this.selectedId = root.id;
    this.render();
    this._renderWiki(root);

    try {
      const data = await this._expandTopic(cleanSeed);
      root.summary = data.summary || '';
      root.subtopics = [];
      root.state = 'explored';
      this._mergeSubtopics(root, data.subtopics || []);
      this._setStatus('Ready');
    } catch (_) {
      root.state = 'unexplored';
      this._setStatus('Needs retry');
    }

    this.render();
    this._renderWiki(root);

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Explore';
    }
  },

  _mergeSubtopics(parent, rawTopics) {
    const cleanTopics = [];
    const seen = new Set();
    rawTopics
      .map(topic => this._sanitizeTopic(topic))
      .filter(Boolean)
      .forEach((topic) => {
        const normalized = this._normalizeTopic(topic);
        if (!normalized || normalized === parent.canonicalKey || seen.has(normalized)) return;
        seen.add(normalized);
        cleanTopics.push(topic);
      });

    parent.subtopics = cleanTopics.slice(0, CONFIG.knowledgeTree.maxSubTopics);
    parent.subtopics.forEach((topic, index) => {
      let node = this.findNodeByTopic(topic);
      const existed = !!node;
      if (!node) {
        node = this._createNode(topic, {
          parent,
          index,
          total: parent.subtopics.length,
          depth: (parent.depth || 0) + 1
        });
      } else {
        node.seenCount += 1;
        node.depth = Math.min(node.depth || Number.POSITIVE_INFINITY, (parent.depth || 0) + 1);
        if (!node.aliases.includes(topic)) node.aliases.push(topic);
        node.discoveredFrom.add(parent.id);
      }

      const linkType = existed ? 'convergent' : parent.id === this.rootId ? 'seed' : 'related';
      this._upsertLink(parent.id, node.id, linkType);
    });

    this._computeDepths();
    this._syncSimulation(parent.id === this.rootId ? 1 : 0.75);
  },

  async explore(id, force = false) {
    const node = this.nodes.find(entry => entry.id === id);
    if (!node) return;

    if (node.state === 'loading') {
      this.selectedId = id;
      this.render();
      this._renderWiki(node);
      return;
    }

    if (node.state !== 'unexplored' && !force) {
      this.selectedId = id;
      this.render();
      this._renderWiki(node);
      this._reheatSimulation(0.2);
      return;
    }

    node.state = 'loading';
    this.selectedId = id;
    this.render();
    this._renderWiki(node);
    this._setStatus(`Growing ${node.topic}`);

    try {
      const data = await this._expandTopic(node.topic, node.subtopics || []);
      node.summary = data.summary || node.summary;
      node.state = 'explored';
      this._mergeSubtopics(node, data.subtopics || []);
      this._setStatus('Ready');
    } catch (_) {
      node.state = node.summary ? 'explored' : 'unexplored';
      this._setStatus('Needs retry');
    }

    this.render();
    this._renderWiki(node);
  },

  focusNode(id, center = false) {
    const node = this.nodes.find(entry => entry.id === id);
    if (!node) return;
    if (node.state === 'unexplored') {
      this.explore(id);
      if (center) setTimeout(() => this._centerOnNode(id), 0);
      return;
    }
    this.selectedId = id;
    this.selectedIds.add(id);
    this.render();
    this._renderWiki(node);
    if (center) this._centerOnNode(id);
    this._reheatSimulation(0.18);
  },

  selectTopicByName(topic) {
    const existing = this.findNodeByTopic(topic);
    if (existing) {
      this.focusNode(existing.id, true);
      return;
    }
    this._exploreByName(topic);
  },

  render() {
    const svg = document.getElementById('ktSvg');
    if (!svg) return;

    const selectedId = this.selectedId;
    const focusMap = selectedId !== null ? this._focusMap(selectedId, 2) : new Map();
    const hasFocus = focusMap.size > 0;
    const maxDepth = Math.max(2, ...this.nodes.map(node => node.depth || 0));

    const defs = `
      <defs>
        <radialGradient id="ktSeedGradient" cx="35%" cy="35%">
          <stop offset="0%" stop-color="#93c5fd" />
          <stop offset="100%" stop-color="#2563eb" />
        </radialGradient>
        <radialGradient id="ktExploredGradient" cx="35%" cy="35%">
          <stop offset="0%" stop-color="#6ee7b7" />
          <stop offset="100%" stop-color="#10b981" />
        </radialGradient>
        <radialGradient id="ktFrontierGradient" cx="35%" cy="35%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="100%" stop-color="#475569" />
        </radialGradient>
        <radialGradient id="ktLoadingGradient" cx="35%" cy="35%">
          <stop offset="0%" stop-color="#fcd34d" />
          <stop offset="100%" stop-color="#f59e0b" />
        </radialGradient>
      </defs>
    `;

    const rings = Array.from({ length: maxDepth + 1 }, (_, depth) => {
      const radius = depth === 0 ? 34 : 120 + depth * 74;
      return `<circle cx="0" cy="0" r="${radius}" fill="none" stroke="rgba(148,163,184,${depth === 0 ? 0.14 : 0.1})" stroke-width="${depth === 0 ? 1.4 : 1}" stroke-dasharray="${depth === 0 ? '0' : '3 8'}"/>`;
    }).join('');

    const edges = this.links.map(link => {
      const source = this.nodes.find(node => node.id === link.sourceId);
      const target = this.nodes.find(node => node.id === link.targetId);
      if (!source || !target) return '';
      const focusA = focusMap.get(source.id);
      const focusB = focusMap.get(target.id);
      const nearSelection = selectedId === source.id || selectedId === target.id;
      const opacity = !hasFocus ? 0.36 : focusA !== undefined && focusB !== undefined ? (nearSelection ? 0.8 : 0.48) : 0.1;
      const stroke = link.type === 'convergent' ? 'rgba(139,92,246,1)' :
        link.type === 'seed' ? 'rgba(37,99,235,1)' : 'rgba(148,163,184,1)';
      const width = nearSelection ? 2.4 : link.type === 'convergent' ? 2 : 1.45;
      const midX = (source.x + target.x) / 2 + (target.y - source.y) * 0.05;
      const midY = (source.y + target.y) / 2 - (target.x - source.x) * 0.05;
      return `<path d="M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;
    }).join('');

    const nodes = this.nodes.map(node => {
      const distance = focusMap.get(node.id);
      const opacity = !hasFocus ? 1 : distance === undefined ? 0.22 : distance === 0 ? 1 : distance === 1 ? 0.92 : 0.62;
      const radius = this._nodeRadius(node);
      const gradient = node.id === this.rootId ? 'url(#ktSeedGradient)' :
        node.state === 'loading' ? 'url(#ktLoadingGradient)' :
        node.state === 'explored' ? 'url(#ktExploredGradient)' : 'url(#ktFrontierGradient)';
      const selected = this.selectedIds.has(node.id) || node.id === selectedId;
      const ring = selected
        ? `<circle cx="${node.x}" cy="${node.y}" r="${radius + 13}" fill="none" stroke="rgba(245,158,11,0.95)" stroke-width="2.2" stroke-dasharray="2 5"/>`
        : distance === 1
          ? `<circle cx="${node.x}" cy="${node.y}" r="${radius + 9}" fill="none" stroke="rgba(59,130,246,0.38)" stroke-width="1.3"/>`
          : '';
      const pulse = node.state === 'loading'
        ? `<circle cx="${node.x}" cy="${node.y}" r="${radius + 8}" fill="none" stroke="rgba(251,191,36,0.8)" stroke-width="1.5">
            <animate attributeName="r" from="${radius + 6}" to="${radius + 18}" dur="1.3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.75" to="0" dur="1.3s" repeatCount="indefinite"/>
          </circle>`
        : '';

      const labelLines = this._wrapLabel(node.topic);
      const showLabel = !hasFocus || distance !== undefined || node.id === this.rootId || node.seenCount > 2;
      const label = showLabel ? labelLines.map((line, index) => `
        <text
          x="${node.x}"
          y="${node.y + radius + 18 + (index * 13)}"
          text-anchor="middle"
          fill="rgba(226,232,240,${selected ? 0.98 : 0.82})"
          font-size="${selected ? 11.5 : 10.5}"
          font-family="system-ui, sans-serif"
          font-weight="${selected ? 700 : 600}"
          paint-order="stroke"
          stroke="rgba(15,23,42,0.72)"
          stroke-width="3"
          stroke-linejoin="round"
          pointer-events="none"
        >${this._escapeHtml(line)}</text>
      `).join('') : '';

      const depthBadge = node.discoveredFrom.size > 1
        ? `<text
            x="${node.x + radius - 3}"
            y="${node.y - radius + 4}"
            text-anchor="middle"
            fill="#f8fafc"
            font-size="9.5"
            font-family="system-ui, sans-serif"
            font-weight="800"
            pointer-events="none"
          >${node.discoveredFrom.size}</text>`
        : '';

      return `
        <g data-node-id="${node.id}" style="cursor:pointer" opacity="${opacity}">
          ${pulse}
          ${ring}
          <circle cx="${node.x}" cy="${node.y}" r="${radius + 7}" fill="rgba(15,23,42,0.08)"/>
          <circle cx="${node.x}" cy="${node.y}" r="${radius}" fill="${gradient}" stroke="rgba(255,255,255,0.16)" stroke-width="1.6"/>
          ${node.discoveredFrom.size > 1 ? `<circle cx="${node.x + radius - 3}" cy="${node.y - radius + 1}" r="9.5" fill="rgba(139,92,246,0.92)"/>` : ''}
          ${depthBadge}
          ${label}
        </g>
      `;
    }).join('');

    svg.innerHTML = `${defs}<g id="ktGraphGroup" transform="translate(${this.pan.x},${this.pan.y}) scale(${this.scale})">${rings}${edges}${nodes}</g>`;
    this._renderMetrics();
  },

  _renderMetrics() {
    const nodeCount = document.getElementById('ktNodeCount');
    const linkCount = document.getElementById('ktLinkCount');
    const frontierCount = document.getElementById('ktFrontierCount');
    const hint = document.getElementById('ktSelectionHint');
    if (nodeCount) nodeCount.textContent = String(this.nodes.length);
    if (linkCount) linkCount.textContent = String(this.links.length);
    if (frontierCount) frontierCount.textContent = String(this.nodes.filter(node => node.state === 'unexplored').length);
    if (hint) {
      const selected = this.nodes.find(node => node.id === this.selectedId);
      hint.textContent = selected
        ? `${selected.topic} is connected to ${selected.neighbors.size} nearby topics${selected.discoveredFrom.size > 1 ? ` and merges ${selected.discoveredFrom.size} converging paths` : ''}.`
        : 'Select any topic to focus its neighborhood, inspect its wiki page, and keep growing the map without spawning duplicate ideas.';
    }
  },

  _renderWiki(node) {
    const header = document.getElementById('ktWikiHeader');
    const title = document.getElementById('ktWikiTitle');
    const meta = document.getElementById('ktWikiMeta');
    const body = document.getElementById('ktWikiBody');
    if (!header || !title || !meta || !body) return;

    header.style.display = 'flex';
    title.textContent = node.topic;
    const metaBits = [
      node.id === this.rootId ? 'Seed topic' : `Depth ${node.depth}`,
      `${node.neighbors.size} connected topics`,
      node.discoveredFrom.size > 1 ? `${node.discoveredFrom.size} converging paths` : 'Single path so far'
    ];
    meta.innerHTML = metaBits.map(bit => `<span class="kt-meta-pill">${this._escapeHtml(bit)}</span>`).join('');

    if (node.state === 'loading') {
      body.innerHTML = `
        <div class="kt-wiki-empty">
          <div class="kt-wiki-empty-icon">...</div>
          <h3>Growing this neighborhood</h3>
          <p>Generating a summary and finding the next set of adjacent concepts.</p>
        </div>
      `;
      return;
    }

    if (node.state === 'unexplored' || !node.summary) {
      body.innerHTML = `
        <div class="kt-wiki-empty">
          <div class="kt-wiki-empty-icon">Go</div>
          <h3>${this._escapeHtml(node.topic)}</h3>
          <p style="margin-bottom:20px;">This topic already exists in the graph, but its wiki page has not been generated yet.</p>
          <button class="kt-wiki-add-btn" onclick="KnowledgeTree.explore(${node.id})">Explore topic</button>
        </div>
      `;
      return;
    }

    const relatedChips = (node.subtopics || []).map(topic => {
      const safeTopic = JSON.stringify(topic);
      return `<button class="kt-subtopic-chip" onclick='KnowledgeTree.selectTopicByName(${safeTopic})'>${this._escapeHtml(topic)}</button>`;
    }).join('');

    const neighborhood = this._relatedNodes(node.id).map(({ neighbor, weight, relationType }) => `
      <button class="kt-neighborhood-item" onclick="KnowledgeTree.focusNode(${neighbor.id}, true)">
        <div class="kt-neighborhood-topic">${this._escapeHtml(neighbor.topic)}</div>
        <div class="kt-neighborhood-meta">${this._escapeHtml(relationType)} | ${weight} shared reference${weight === 1 ? '' : 's'} | ${neighbor.state === 'explored' ? 'Wiki ready' : 'Frontier topic'}</div>
      </button>
    `).join('');

    const aliases = node.aliases.length > 1
      ? `<div class="kt-section">
          <h4>Also Seen As</h4>
          <div class="kt-subtopic-chips">${node.aliases.slice(1).map(alias => `<span class="kt-subtopic-chip" style="cursor:default;">${this._escapeHtml(alias)}</span>`).join('')}</div>
        </div>`
      : '';

    body.innerHTML = `
      <div class="kt-summary-actions">
        <button class="kt-link-button" onclick="KnowledgeTree.centerOnSelection()">Center in graph</button>
        <button class="kt-link-button" onclick="KnowledgeTree.explore(${node.id}, true)">Grow neighborhood</button>
      </div>
      <div class="kt-wiki-summary">${Markdown.render(node.summary)}</div>
      ${relatedChips ? `
        <details class="kt-section" open>
          <summary><h4>Suggested Next Directions</h4></summary>
          <div class="kt-section-note">These are the next concepts the model thinks belong close to this topic. Existing topics will merge into the same node instead of spawning duplicates.</div>
          <div class="kt-subtopic-chips" style="margin-top:12px;">${relatedChips}</div>
        </details>
      ` : ''}
      ${neighborhood ? `
        <details class="kt-section" open>
          <summary><h4>Connected Topics</h4></summary>
          <div class="kt-section-note">These topics are already touching this node in the graph, which lets you move across the map without losing the bigger structure.</div>
          <div class="kt-neighborhood-list" style="margin-top:12px;">${neighborhood}</div>
        </details>
      ` : ''}
      ${aliases}
    `;
  },

  _renderMultiSelectWiki() {
    const header = document.getElementById('ktWikiHeader');
    const title = document.getElementById('ktWikiTitle');
    const meta = document.getElementById('ktWikiMeta');
    const body = document.getElementById('ktWikiBody');
    if (!header || !title || !meta || !body) return;

    header.style.display = 'flex';
    title.textContent = `${this.selectedIds.size} topics selected`;
    meta.innerHTML = \`<span class="kt-meta-pill">Multiple selection</span>\`;

    const selectedNodes = Array.from(this.selectedIds).map(id => this.nodes.find(n => n.id === id)).filter(Boolean);
    const chips = selectedNodes.map(node => \`<span class="kt-subtopic-chip" style="cursor:default; background:var(--surface-hover);">\${this._escapeHtml(node.topic)}</span>\`).join('');

    body.innerHTML = \`
      <div class="kt-section">
        <h4>Selected Topics</h4>
        <div class="kt-subtopic-chips">\${chips}</div>
      </div>
      <div class="kt-summary-actions" style="margin-top:20px;">
        <button class="kt-start-btn" id="ktConnectIdeasBtn" style="width:100%;" onclick="KnowledgeTree.connectSelectedIdeas()">Connect Ideas</button>
      </div>
      <div id="ktConnectIdeasResult" style="margin-top:16px;"></div>
    \`;
  },

  async connectSelectedIdeas() {
    const selectedNodes = Array.from(this.selectedIds).map(id => this.nodes.find(n => n.id === id)).filter(Boolean);
    if (selectedNodes.length < 2) return;
    const btn = document.getElementById('ktConnectIdeasBtn');
    const resultDiv = document.getElementById('ktConnectIdeasResult');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Connecting...';
    }
    resultDiv.innerHTML = '<div class="kt-wiki-empty"><p>Analyzing connections...</p></div>';

    const topics = selectedNodes.map(n => n.topic).join(', ');
    const prompt = \`Analyze the potential connections, shared principles, or intersections between these topics: \${topics}. Provide a concise 2-3 paragraph synthesis explaining how they relate to each other.\`;
    
    try {
      const result = await API.gemini(prompt);
      resultDiv.innerHTML = \`<div class="kt-wiki-summary">\${Markdown.render(result)}</div>\`;
    } catch (e) {
      resultDiv.innerHTML = \`<p style="color:red;">Error: \${e.message}</p>\`;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Connect Ideas';
      }
    }
  },

  _renderWikiEmpty() {
    const header = document.getElementById('ktWikiHeader');
    const body = document.getElementById('ktWikiBody');
    if (header) header.style.display = 'none';
    if (body) {
      body.innerHTML = `
        <div class="kt-wiki-empty">
          <div class="kt-wiki-empty-icon">KG</div>
          <h3>Build a map, not just a branch</h3>
          <p>Start from a seed topic or click a topic in the graph. The right pane becomes a living wiki page while the left pane keeps the wider structure in view.</p>
        </div>
      `;
    }
  },

  async _exploreByName(topic) {
    const cleanTopic = this._sanitizeTopic(topic);
    if (!cleanTopic) return;
    const selected = this.nodes.find(node => node.id === this.selectedId);
    const existing = this.findNodeByTopic(cleanTopic);
    if (existing) {
      if (selected && selected.id !== existing.id) this._upsertLink(selected.id, existing.id, 'convergent');
      this._computeDepths();
      this.render();
      this.focusNode(existing.id, true);
      return;
    }
    const node = this._createNode(cleanTopic, {
      parent: selected || null,
      depth: (selected?.depth || 0) + (selected ? 1 : 0)
    });
    if (selected) this._upsertLink(selected.id, node.id, 'related');
    if (this.rootId === null || this.rootId === undefined) this.rootId = node.id;
    this._computeDepths();
    this._syncSimulation(0.82);
    this.selectedId = node.id;
    this.render();
    this._renderWiki(node);
    this.explore(node.id);
  },

  addCurrentAsSource() {
    const node = this.nodes.find(entry => entry.id === this.selectedId);
    if (!node || !node.summary) return;
    if (!App.currentNotebook) {
      UI.showContent('<div class="generated-content"><h3>Warning: no notebook open</h3><p>Create or open a notebook first.</p></div>');
      Tabs.show('notebook');
      return;
    }
    const already = App.currentNotebook.sources.find(source => source.name === node.topic);
    if (already) return;
    App.currentNotebook.sources.push({
      name: node.topic,
      type: 'KNOWLEDGE_TREE',
      content: `${node.summary}\n\nRelated topics: ${(node.subtopics || []).join(', ')}`,
      summary: node.summary,
      keyPoints: node.subtopics || [],
      addedAt: Date.now()
    });
    Storage.saveNotebooks(App.notebooks);
    App.renderSources();
    const btn = document.getElementById('ktWikiAddBtn');
    if (btn) {
      btn.textContent = 'Added';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '+ Add as Source';
        btn.disabled = false;
      }, 2000);
    }
  },

  renderNodes() {
    this.render();
  }
};

// ============================================
// MODULE: Markdown
// Renders AI text with clickable knowledge links
// ============================================
const Markdown = {
  render(text) {
    if (!text) return '';

    let h = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    h = h.replace(/^### (.+)$/gm, '<h4 style="margin:14px 0 6px;font-size:14px;">$1</h4>');
    h = h.replace(/^## (.+)$/gm, '<h3 style="margin:16px 0 8px;font-size:15px;">$1</h3>');
    h = h.replace(/^# (.+)$/gm, '<h2 style="margin:18px 0 10px;font-size:17px;">$1</h2>');

    h = h.replace(/\*\*(.+?)\*\*/g, (_, term) => {
      const safe = term.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<a class="cite-link" href="#" data-cite="${term.replace(/"/g, '&quot;')}" onclick="Markdown.open('${safe}');return false;">${term}</a>`;
    });

    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^[-•*]\s+(.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, '$1\n');
    h = h.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="margin:8px 0 8px 20px;">$1</ul>');
    h = h.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    h = h.replace(/\n{2,}/g, '</p><p style="margin:0 0 10px;">');
    h = h.replace(/\n/g, '<br>');
    h = `<p style="margin:0 0 10px;">${h}</p>`;

    return h;
  },

  open(term) {
    const cleanTerm = String(term || '').trim();
    if (!cleanTerm) return;

    const sources = App.currentNotebook?.sources || [];

    const exact = sources.findIndex(source => source.name.toLowerCase() === cleanTerm.toLowerCase());
    if (exact >= 0) {
      App.viewSource(exact);
      Tabs.show('notebook');
      return;
    }

    const partial = sources.findIndex(source =>
      source.name.toLowerCase().includes(cleanTerm.toLowerCase()) ||
      cleanTerm.toLowerCase().includes(source.name.toLowerCase())
    );
    if (partial >= 0) {
      App.viewSource(partial);
      Tabs.show('notebook');
      return;
    }

    const node = KnowledgeTree.findNodeByTopic(cleanTerm);
    Tabs.show('kt');
    if (node) {
      KnowledgeTree.focusNode(node.id, true);
      return;
    }

    KnowledgeTree.selectTopicByName(cleanTerm);
  }
};

const Chat = {
  history: [],
  
  async send() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    if (!question) return;
    
    this.history.push({ role: 'user', content: question });
    input.value = '';
    this.render();
    
    // Show loading
    this.history.push({ role: 'assistant', content: 'Thinking...' });
    this.render();
    
    try {
      const answer = await this.askWithSources(question);
      this.history.pop();
      this.history.push({ role: 'assistant', content: answer.text, citations: answer.citations });
    } catch (e) {
      this.history.pop();
      this.history.push({ role: 'assistant', content: `Error: ${e.message}` });
    }
    
    App.currentNotebook.chatHistory = this.history;
    Storage.saveNotebooks(App.notebooks);
    this.render();
  },

  async askWithSources(question) {
    const context = App.currentNotebook.sources
      .filter(s => s.content)
      .map(s => `[${s.name}]\n${s.content.substring(0, 3000)}`)
      .join('\n\n---\n\n');
    
    if (!context) return { text: 'No sources with content to analyze.', citations: [] };
    
    const result = await API.gemini(`Based on these sources, answer the question. Cite sources by name.\n\nSOURCES:\n${context}\n\nQUESTION: ${question}`);
    
    const citations = App.currentNotebook.sources
      .filter(s => result.toLowerCase().includes(s.name.toLowerCase()))
      .map(s => s.name);
    
    return { text: result, citations };
  },

  render() {
    const container = document.getElementById('chatMessages');
    if (!this.history.length) {
      container.innerHTML = `
        <div class="empty-panel">
          <div class="empty-panel-icon">💬</div>
          <h3>Chat with your sources</h3>
          <p>Ask questions and get answers with citations</p>
        </div>`;
      return;
    }
    
    container.innerHTML = this.history.map(msg => `
      <div class="chat-message ${msg.role}">
        <div class="chat-bubble">${msg.role === 'assistant' ? Markdown.render(msg.content) : msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        ${msg.citations?.length ? `<div class="chat-citations">Sources: ${msg.citations.map(c => `<a class="cite-link" href="#" onclick="Markdown.open('${c.replace(/'/g,"\\'")}');return false;">${c}</a>`).join(', ')}</div>` : ''}
      </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
  }
};

// ============================================
// MODULE: Podcast
// Generates a two-host audio overview from notebook sources
// ============================================
const Podcast = {
  async generate() {
    if (!App.currentNotebook?.sources?.length) {
      UI.showContent('<div class="generated-content"><h3>⚠️ No sources</h3><p>Add sources before generating an Audio Overview.</p></div>');
      return;
    }

    UI.showContent(`<div class="generated-content" style="text-align:center;padding:40px 24px;">
      <div style="font-size:48px;margin-bottom:16px;">🎙</div>
      <h3 style="margin-bottom:8px;">Generating Audio Overview…</h3>
      <p id="podcastStatus" style="color:var(--text-secondary);">Writing podcast script…</p>
    </div>`);

    const setStatus = (msg) => { const el = document.getElementById('podcastStatus'); if (el) el.textContent = msg; };

    try {
      const content = App.currentNotebook.sources
        .filter(s => s.content)
        .map(s => `[${s.name}]\n${s.content.substring(0, 3000)}`)
        .join('\n\n---\n\n')
        .substring(0, 18000);

      const prompt = `You are producing an Audio Overview podcast, exactly like Google NotebookLM's feature.

Create a natural, engaging two-host podcast script from the sources below.

HOST1 is Emma — enthusiastic, curious, loves explaining ideas clearly. She drives the conversation and gets genuinely excited about discoveries.
HOST2 is Andrew — thoughtful, analytical, asks probing questions, occasionally skeptical, grounds the discussion with nuance.

RULES (follow strictly):
- Sound completely natural: use "um", "you know", "right?", "exactly", "wait—", "hm", "oh interesting", "so basically", "I mean", "and honestly"
- Hosts react to each other, finish thoughts, occasionally interrupt mid-sentence with "— wait, actually..."
- Structure: warm intro teasing the topic → deep dive covering all major themes → brief reflective outro
- 22–28 exchanges total. Each line is 1–3 sentences max — conversational, not lecture-y
- Do NOT use bullet points, headers, or markdown — spoken dialogue only
- Output ONLY the script lines, no stage directions, no extra text

FORMAT (exactly):
HOST1: text
HOST2: text
HOST1: text

SOURCES:
${content}`;

      const raw = await API.gemini(prompt);

      const lines = raw.split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('HOST1:') || l.startsWith('HOST2:'))
        .map(l => ({ speaker: l.startsWith('HOST1:') ? 'host1' : 'host2', text: l.replace(/^HOST[12]:\s*/, '').trim() }))
        .filter(l => l.text.length > 0);

      if (!lines.length) throw new Error('Script generation failed - no dialogue lines parsed.');
      const hasHost1 = lines.some((line) => line.speaker === 'host1');
      const hasHost2 = lines.some((line) => line.speaker === 'host2');
      if (!(hasHost1 && hasHost2) && lines.length > 1) {
        for (let idx = 0; idx < lines.length; idx += 1) {
          lines[idx].speaker = idx % 2 === 0 ? 'host1' : 'host2';
        }
      }

      setStatus(`Synthesizing audio for ${lines.length} exchanges…`);

      const response = await fetch('/api/research/podcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-elevenlabs-key': await API.getElevenLabsKey() || ''
        },
        body: JSON.stringify({ lines })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'TTS generation failed');

      const bytes = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], { type: result.mimeType });
      const url   = URL.createObjectURL(blob);

      const transcript = lines.map(l => `
        <div class="transcript-line ${l.speaker}">
          <span class="transcript-speaker">${l.speaker === 'host1' ? 'Emma' : 'Andrew'}</span>
          <span class="transcript-text">${l.text}</span>
        </div>`).join('');

      UI.showContent(`
        <div class="generated-content">
          <h3 style="margin-bottom:4px;">🎙 Audio Overview</h3>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">${lines.length} exchanges · Emma &amp; Andrew · ${result.provider || 'audio engine'}</p>
          <audio controls src="${url}" style="width:100%;border-radius:8px;margin-bottom:20px;"></audio>
          <details>
            <summary style="cursor:pointer;font-size:13px;color:var(--text-secondary);user-select:none;margin-bottom:12px;">📄 Show transcript</summary>
            <div class="podcast-transcript">${transcript}</div>
          </details>
        </div>`);

    } catch (e) {
      UI.showContent(`<div class="generated-content"><h3>⚠️ Audio Overview failed</h3><p>${e.message}</p></div>`);
    }
  }
};

// ============================================
// MODULE: Generator
// Handles content generation from sources
// ============================================
const Generator = {
  async generate(type) {
    if (!App.currentNotebook.sources.length) {
      UI.showContent('<div class="generated-content"><h3>⚠️ No sources</h3><p>Add sources first.</p></div>');
      return;
    }
    
    UI.showLoading('Generating...');
    
    const content = App.currentNotebook.sources.map(s => s.content).join('\n\n---\n\n').substring(0, CONFIG.knowledgeTree.maxContentLength);
    const config = CONFIG.generationTypes[type];
    
    const result = await API.gemini(`${config.prompt}:\n\n${content}`);
    
    UI.showContent(`
      <div class="generated-content">
        <h3>${config.icon} ${config.label}</h3>
        ${Markdown.render(result)}
      </div>
    `);
  }
};

// ============================================
// MODULE: UI
// Handles all UI rendering and interactions
// ============================================
const UI = {
  showLoading(message) {
    document.getElementById('generatedContent').innerHTML = 
      `<div class="loading"><div class="spinner"></div><p>${message}</p></div>`;
  },

  showContent(html) {
    document.getElementById('generatedContent').innerHTML = html;
  },

  showSuccess(message) {
    this.showContent(`<div class="generated-content"><h3>✅ ${message}</h3></div>`);
    setTimeout(() => document.getElementById('generatedContent').innerHTML = '', 2000);
  },

  openModal(id) { document.getElementById(id).classList.add('open'); },
  closeModal(id) { document.getElementById(id).classList.remove('open'); },

  updateSourceCount() {
    const count = App.currentNotebook?.sources?.length || 0;
    document.getElementById('sourceCount').textContent = `${count} source${count !== 1 ? 's' : ''}`;
  }
};

const Settings = {
  async load() {
    const geminiKey = await API.getGeminiKey();
    const geminiInput = document.getElementById('geminiApiKeyInput');
    if (geminiInput) geminiInput.value = geminiKey || '';

    const tavilyKey = await API.getTavilyKey();
    const tavilyInput = document.getElementById('tavilyApiKeyInput');
    if (tavilyInput) tavilyInput.value = tavilyKey || '';

    const elevenLabsKey = await API.getElevenLabsKey();
    const elevenLabsInput = document.getElementById('elevenLabsApiKeyInput');
    if (elevenLabsInput) elevenLabsInput.value = elevenLabsKey || '';

    const ttsProvider = await API.getTtsProvider();
    const ttsProviderInput = document.getElementById('ttsProviderSelect');
    if (ttsProviderInput) ttsProviderInput.value = ttsProvider || 'auto';

    const dark = localStorage.getItem('darkMode') === 'true';
    this.applyDark(dark);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = dark;
  },

  applyDark(enabled) {
    document.documentElement.classList.toggle('dark', enabled);
  },

  async save() {
    const geminiVal = document.getElementById('geminiApiKeyInput')?.value || '';
    await API.setGeminiKey(geminiVal);

    const tavilyVal = document.getElementById('tavilyApiKeyInput')?.value || '';
    await API.setTavilyKey(tavilyVal);

    const elevenLabsVal = document.getElementById('elevenLabsApiKeyInput')?.value || '';
    await API.setElevenLabsKey(elevenLabsVal);

    const ttsProviderVal = document.getElementById('ttsProviderSelect')?.value || 'auto';
    await API.setTtsProvider(ttsProviderVal);

    const dark = document.getElementById('darkModeToggle')?.checked ?? false;
    localStorage.setItem('darkMode', dark);
    this.applyDark(dark);

    UI.closeModal('settingsModal');
    UI.showSuccess('Settings saved');
  }
};

// ============================================
// MODULE: App
// Main application controller
// ============================================
const App = {
  notebooks: [],
  currentNotebook: null,

  async init() {
    this.notebooks = await Storage.loadNotebooks();
    this.setupEvents();
    this.setupTabContextMenu();
    KnowledgeTree.init();
    await Settings.load();
    if (!await API.getTtsProvider()) {
      await API.setTtsProvider('auto');
    }

    
    if (this.notebooks.length > 0) {
      this.selectNotebook(this.notebooks[0].id);
      document.getElementById('welcomeModal').classList.remove('open');
    }
  },

  selectNotebook(id) {
    this.currentNotebook = this.notebooks.find(nb => nb.id === id);
    if (!this.currentNotebook) return;
    
    this.currentNotebook.sources = this.currentNotebook.sources || [];
    this.currentNotebook.chatHistory = this.currentNotebook.chatHistory || [];
    
    Chat.history = this.currentNotebook.chatHistory;
    this.renderSources();
    Chat.render();
    UI.updateSourceCount();
    document.getElementById('viewNotebookBtn').style.display = 'block';
  },

  renderSources() {
    const list = document.getElementById('sourceList');
    const sources = this.currentNotebook?.sources || [];
    
    if (!sources.length) {
      list.innerHTML = `<div class="empty-panel"><div class="empty-panel-icon">📄</div><h3>No sources</h3><p>Click Add Sources</p></div>`;
      return;
    }
    
    list.innerHTML = sources.map((s, i) => `
      <div class="source-item" onclick="App.viewSource(${i})">
        <div class="source-icon">${CONFIG.sourceIcons[s.type] || '📄'}</div>
        <div class="source-info">
          <div class="source-title">${s.name}</div>
          <div class="source-meta">${s.content?.length || 0} chars</div>
        </div>
        <button class="source-delete" onclick="event.stopPropagation(); App.deleteSource(${i})">✕</button>
      </div>
    `).join('');
  },

  viewSource(index) {
    const source = this.currentNotebook.sources[index];
    UI.showContent(`
      <div class="generated-content">
        <h3>📄 ${source.name}</h3>
        <p>${source.content || source.summary || 'No content'}</p>
      </div>
    `);
  },

  deleteSource(index) {
    this.currentNotebook.sources.splice(index, 1);
    Storage.saveNotebooks(this.notebooks);
    this.renderSources();
    UI.updateSourceCount();
  },

  createNotebook() {
    const name = document.getElementById('notebookName').value.trim();
    if (!name) return;
    const notebook = Storage.createNotebook(name);
    this.notebooks.push(notebook);
    Storage.saveNotebooks(this.notebooks);
    UI.closeModal('notebookModal');
    document.getElementById('notebookName').value = '';
    this.selectNotebook(notebook.id);
  },

  renderNotebookList() {
    const list = document.getElementById('notebookList');
    if (!list) return;
    if (!this.notebooks.length) {
      list.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;padding:8px 0;">No notebooks yet — create one below.</p>';
      return;
    }
    list.innerHTML = this.notebooks.map(nb => `
      <div class="notebook-list-item ${nb.id === this.currentNotebook?.id ? 'active' : ''}" id="nbitem-${nb.id}">
        <span class="notebook-list-name" onclick="App.selectNotebook('${nb.id}'); App.renderNotebookList();">${nb.name}</span>
        <button class="notebook-rename-btn" onclick="App.startRename('${nb.id}')" title="Rename">✏️</button>
        <button class="notebook-delete-btn" onclick="App.deleteNotebook('${nb.id}')" title="Delete notebook">🗑</button>
      </div>
    `).join('');
  },

  startRename(id) {
    const nb = this.notebooks.find(n => n.id === id);
    const item = document.getElementById(`nbitem-${id}`);
    if (!nb || !item) return;
    item.innerHTML = `
      <input class="notebook-rename-input" id="renameInput-${id}" value="${nb.name.replace(/"/g, '&quot;')}">
      <button class="btn btn-primary" style="padding:4px 10px;font-size:12px;" onclick="App.saveRename('${id}')">Save</button>
      <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="App.renderNotebookList()">✕</button>
    `;
    const input = document.getElementById(`renameInput-${id}`);
    if (input) {
      input.focus(); input.select();
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') App.saveRename(id);
        if (e.key === 'Escape') App.renderNotebookList();
      });
    }
  },

  saveRename(id) {
    const input = document.getElementById(`renameInput-${id}`);
    const newName = input?.value.trim();
    if (!newName) return;
    const nb = this.notebooks.find(n => n.id === id);
    if (!nb) return;
    nb.name = newName;
    Storage.saveNotebooks(this.notebooks);
    this.renderNotebookList();
  },

  deleteNotebook(id) {
    const nb = this.notebooks.find(n => n.id === id);
    if (!nb) return;
    if (!confirm(`Delete "${nb.name}"? This cannot be undone.`)) return;
    this.notebooks = this.notebooks.filter(n => n.id !== id);
    Storage.saveNotebooks(this.notebooks);
    if (this.currentNotebook?.id === id) {
      this.currentNotebook = this.notebooks[0] || null;
      if (this.currentNotebook) this.selectNotebook(this.currentNotebook.id);
      else { this.renderSources(); Chat.history = []; Chat.render(); }
    }
    this.renderNotebookList();
  },

  setupTabContextMenu() {
    const tab = document.getElementById('tabNotebook');
    if (!tab) return;
    tab.addEventListener('contextmenu', (e) => {
      if (!this.currentNotebook) return;
      e.preventDefault();
      document.getElementById('ctxMenu')?.remove();
      const menu = document.createElement('div');
      menu.id = 'ctxMenu';
      menu.className = 'ctx-menu';
      menu.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`;
      menu.innerHTML = `
        <div class="ctx-item" onclick="App.startTabRename()">✏️ Rename</div>
        <div class="ctx-item ctx-item-danger" onclick="App.deleteNotebook('${this.currentNotebook.id}')">🗑 Delete</div>
      `;
      document.body.appendChild(menu);
      const close = () => { menu.remove(); document.removeEventListener('click', close); };
      setTimeout(() => document.addEventListener('click', close), 0);
    });
  },

  startTabRename() {
    if (!this.currentNotebook) return;
    const name = prompt('Rename notebook:', this.currentNotebook.name);
    if (!name?.trim()) return;
    this.currentNotebook.name = name.trim();
    Storage.saveNotebooks(this.notebooks);
  },

   setupEvents() {
     document.getElementById('addSourcesBtn').addEventListener('click', () => UI.openModal('discoverModal'));
     document.getElementById('chatSendBtn').addEventListener('click', () => Chat.send());
     document.getElementById('chatInput').addEventListener('keypress', (e) => {
       if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Chat.send(); }
     });
     document.getElementById('viewNotebookBtn').addEventListener('click', () => { UI.openModal('notebookModal'); App.renderNotebookList(); });
     document.getElementById('settingsBtn').addEventListener('click', () => UI.openModal('settingsModal'));
     document.getElementById('saveSettingsBtn').addEventListener('click', () => Settings.save());
     document.getElementById('ktStartBtn').addEventListener('click', () => KnowledgeTree.start(document.getElementById('ktSeedInput').value.trim()));
     document.getElementById('ktSeedInput').addEventListener('keypress', (e) => {
       if (e.key === 'Enter') KnowledgeTree.start(document.getElementById('ktSeedInput').value.trim());
     });
     document.getElementById('ktRecenterBtn').addEventListener('click', () => KnowledgeTree.centerOnSelection());
     document.getElementById('ktResetViewBtn').addEventListener('click', () => KnowledgeTree.resetView());
     
     // Discover modal events
     document.getElementById('searchBtn').addEventListener('click', async () => {
       const topic = document.getElementById('discoverTopic').value.trim();
       if (!topic) return;
       const btn = document.getElementById('searchBtn');
       const container = document.getElementById('discoverResults');
       btn.disabled = true;
       btn.textContent = 'Searching…';
       container.innerHTML = '<p id="searchStatus" style="text-align:center;padding:16px;">Searching for candidates…</p>';
       document.getElementById('importSelectedBtn').disabled = true;
       const setStatus = (msg) => {
         const el = document.getElementById('searchStatus');
         if (el) el.textContent = msg;
       };
       try {
         await SourceDiscovery.search(
           topic,
           document.getElementById('sourceTypeSelect').value,
           parseInt(document.getElementById('sourceCountSelect').value),
           setStatus
         );
         SourceDiscovery.renderResults();
       } catch (e) {
         container.innerHTML = `<p style="color:red;text-align:center;">Search failed: ${e.message}</p>`;
       } finally {
         btn.disabled = false;
         btn.textContent = 'Search';
       }
     });
     document.getElementById('cancelDiscoverBtn').addEventListener('click', () => UI.closeModal('discoverModal'));
     document.getElementById('importSelectedBtn').addEventListener('click', () => SourceDiscovery.importSelected());
     document.getElementById('selectAllSources').addEventListener('change', (e) => {
       SourceDiscovery.toggleSelectAll(e.target.checked);
     });
   }
};

// Make globally accessible
window.App = App;
window.UI = UI;
window.Chat = Chat;
window.Generator = Generator;
window.Podcast = Podcast;
window.Markdown = Markdown;
window.SourceDiscovery = SourceDiscovery;
window.KnowledgeTree = KnowledgeTree;
window.Tabs = Tabs;
window.CONFIG = CONFIG;
window.Settings = Settings;
window.openModal = (id) => UI.openModal(id);
window.closeModal = (id) => UI.closeModal(id);
window.createNotebook = () => App.createNotebook();
window.toggleSelectAll = (checked) => {
  const effectiveChecked = typeof checked === 'boolean'
    ? checked
    : document.getElementById('selectAllSources')?.checked;
  SourceDiscovery.toggleSelectAll(!!effectiveChecked);
};

// Initialize
document.addEventListener('DOMContentLoaded', () => App.init());
