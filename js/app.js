(function () {
  // Mobile & Desktop Hamburger Drawer Menu
  initNavMenu();
  // Light / Dark Theme Switcher
  initTheme();

  function initTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    const storedTheme = localStorage.getItem("toolgenie_theme");
    const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    let currentTheme = storedTheme || (systemPrefersDark ? "dark" : "light");

    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("toolgenie_theme", theme);
      if (themeBtn) {
        const isDark = theme === "dark";
        const iconSpan = themeBtn.querySelector(".theme-icon");
        if (iconSpan) {
          iconSpan.textContent = isDark ? "☀️" : "🌙";
        } else {
          themeBtn.textContent = isDark ? "☀️" : "🌙";
        }
        themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
        themeBtn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
      }
    }

    applyTheme(currentTheme);

    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const active = document.documentElement.getAttribute("data-theme") || "light";
        const next = active === "dark" ? "light" : "dark";
        applyTheme(next);
      });
    }

    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("toolgenie_theme")) {
          applyTheme(e.matches ? "dark" : "light");
        }
      });
    }
  }

  function initNavMenu() {
    const toggleBtn = document.getElementById("menu-toggle");
    const overlay = document.getElementById("menu-overlay");
    const closeBtn = document.getElementById("menu-close-btn");
    if (!toggleBtn || !overlay) return;

    function openMenu() {
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
      toggleBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }

    function closeMenu() {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      toggleBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    toggleBtn.addEventListener("click", () => {
      if (overlay.classList.contains("active")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeMenu);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("active")) {
        closeMenu();
      }
    });
  }

  // Global state
  window.__cards = window.__cards || [];
  let currentStudyIndex = 0;
  let isStudyFlipped = false;

  const form = document.getElementById("generator");
  if (!form) return;

  const source = document.getElementById("source");
  const out = document.getElementById("cards");
  const status = document.getElementById("status");
  const countEl = document.getElementById("count");
  const exportBtn = document.getElementById("export");
  const dropzone = document.getElementById("pdf-dropzone");
  const pdfFileInput = document.getElementById("pdf-file-input");
  const fileBanner = document.getElementById("file-loaded-banner");
  const fileNameEl = document.getElementById("file-loaded-name");
  const filePagesEl = document.getElementById("file-loaded-pages");
  const removeFileBtn = document.getElementById("remove-file-btn");
  const studyContainer = document.getElementById("study-container");
  const ankiPreviewContainer = document.getElementById("anki-preview-container");

  // Sample data presets for quick testing
  const samplePresets = {
    biology: `Photosynthesis is the biological process used by plants, algae, and cyanobacteria to convert light energy into chemical energy stored in glucose.
The light-dependent reactions take place in the thylakoid membranes of chloroplasts, where chlorophyll absorbs photons to produce ATP and NADPH.
The Calvin cycle (light-independent reactions) occurs in the stroma of chloroplasts, using ATP and NADPH to fix carbon dioxide (CO2) into carbohydrates.
Mitochondria are double-membraned organelles known as the powerhouse of the cell because they generate most of the cell's supply of adenosine triphosphate (ATP) through cellular respiration.
Cellular respiration consists of three main stages: glycolysis, the citric acid (Krebs) cycle, and oxidative phosphorylation.
Glycolysis occurs in the cytoplasm and breaks down one glucose molecule into two pyruvate molecules without requiring oxygen.
The primary function of ATP synthase is to synthesize ATP from ADP and inorganic phosphate using the proton gradient across the inner mitochondrial membrane.`,
    history: `The Industrial Revolution began in Great Britain during the mid-18th century, transitioning economies from agrarian craftsmanship to machine-driven manufacturing.
James Watt improved Thomas Newcomen's steam engine in 1776, greatly increasing its efficiency and enabling steam power to drive factories, locomotives, and ships.
The Treaty of Versailles was signed in June 1919, officially ending World War I between Germany and the Allied Powers.
Article 231 of the Treaty of Versailles, known as the "War Guilt Clause," forced Germany to accept complete responsibility for causing the war and pay heavy reparations.
The Marshall Plan (European Recovery Program) was an American initiative enacted in 1948 to provide over $12 billion in economic assistance to help rebuild Western European economies after World War II.
The primary objective of the Marshall Plan was to prevent the spread of Soviet communism and restore market economies in Europe.`,
    cs: `A Binary Search Tree (BST) is a hierarchical node-based data structure where each node has at most two children, and the left subtree contains only keys less than the node's key, while the right subtree contains only keys greater.
The average-case time complexity of search, insertion, and deletion in a balanced Binary Search Tree is O(log n).
In the worst-case scenario of an unbalanced BST (a degenerate linear chain), the time complexity degrades to O(n).
HTTP (Hypertext Transfer Protocol) is an application-layer protocol for transmitting hypermedia documents, functioning on a client-server request-response model over TCP.
The primary difference between TCP and UDP is that TCP is connection-oriented and guarantees reliable, ordered packet delivery, whereas UDP is connectionless and prioritizes low latency without delivery guarantees.
A closure in JavaScript is a function bundled together with references to its surrounding lexical environment, allowing the inner function to access variables from an outer enclosing function even after the outer function has returned.`,
    youtube_ai: `0:00 [Music]
Welcome back everyone. Today we are exploring Artificial Neural Networks and Deep Learning in computer science.
0:08
An artificial neural network is a computational learning model inspired by the biological neural networks in animal brains.
0:17
It consists of interconnected processing units called artificial neurons organized in input layers, hidden layers, and output layers.
0:28
The primary function of an activation function is to introduce non-linearity, allowing the neural network to learn complex patterns and nonlinear decision boundaries.
0:42
Backpropagation is the primary supervised learning algorithm used to train feedforward neural networks. It calculates the gradient of the loss function with respect to each weight using the chain rule.
0:58
Gradient descent is an optimization algorithm used to iteratively update network weights and biases in order to minimize the total loss.
1:12
The difference between supervised learning and unsupervised learning is that supervised learning requires labeled training data, whereas unsupervised learning discovers patterns in unlabeled data.
1:27 [Music]
Overfitting occurs when a machine learning model fits the training dataset too closely, capturing random noise, which causes poor generalization on unseen validation data.
1:40
Dropout is a regularization technique where randomly selected neurons are ignored during training passes to prevent excessive co-adaptation of features.`,
    youtube_astro: `0:00
Hello everyone. Today's lecture covers the astrophysics of black holes and the nature of spacetime curvature.
0:10
A black hole is a region of spacetime where gravitational acceleration is so intense that nothing, not even electromagnetic radiation such as light, can escape from inside it.
0:24
The general theory of relativity predicts that a sufficiently compact mass can deform spacetime geometry to form a gravitational black hole.
0:35
The boundary of the region through which no matter or energy can escape is known as the event horizon.
0:46
The Schwarzschild radius is the radius defining the event horizon of a non-rotating, spherically symmetric black hole, and is directly proportional to its mass.
1:01
At the center of a black hole lies a gravitational singularity, where the curvature of spacetime is predicted to become infinite according to classical physics.
1:15
Hawking radiation is theoretical thermal radiation predicted to be emitted by black holes due to quantum vacuum fluctuations taking place near the event horizon.
1:30
The first direct visual evidence and radio image of a supermassive black hole at the center of the Messier 87 galaxy was captured by the Event Horizon Telescope (EHT) in 2019.`
  };

  // Bind Sample Chips
  document.querySelectorAll("[data-sample]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const type = chip.getAttribute("data-sample");
      if (samplePresets[type] && source) {
        source.value = samplePresets[type];
        source.focus();
        showStatus(`Loaded sample ${type} notes. Click "Generate flashcards" to create cards.`);
      }
    });
  });

  // Client-side Smart Heuristic Flashcard Extractor (offline/fallback)
  function extractHeuristicCards(text, requestedCount) {
    if (!text || text.trim().length < 15) return [];
    const target = requestedCount || 12;
    const clean = text
      .replace(/\r\n/g, "\n")
      .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // If text is extensive (>1200 chars), automatically allow expanding up to 36 cards
    // If text is short, stick to target as upper bound, never adding artificial fluff
    const max = clean.length > 1200
      ? Math.max(target, Math.min(36, Math.floor(clean.length / 115)))
      : target;

    const cards = [];
    const seen = new Set();

    function pushCard(q, a) {
      if (!q || !a) return;
      const cleanQ = q.trim().replace(/\s+/g, " ");
      const cleanA = a.trim().replace(/\s+/g, " ");
      const key = cleanQ.toLowerCase();
      if (seen.has(key) || cleanA.length < 5) return;
      seen.add(key);
      cards.push({ q: cleanQ, a: cleanA });
    }

    // 1. Definition patterns: Term is/are [a/the] ...
    const defRegex = /(?:^|[.!?]\s*)([A-Z][a-zA-Z0-9\s/_-]{2,35})\s+(?:is defined as|refers to|means|is the process of|is a type of|is known as)\s+([^.!?]+[.!?])/gi;
    let match;
    while ((match = defRegex.exec(clean)) !== null && cards.length < max) {
      const term = match[1].trim();
      const rest = match[2].trim();
      pushCard(`What is ${term}?`, `${term} ${match[0].toLowerCase().includes("refers to") ? "refers to" : "is"} ${rest}`);
    }

    // 2. Colon notes: Term: Explanation
    const colonRegex = /(?:^|\n|[.!?]\s*)([A-Z][a-zA-Z0-9\s/_-]{2,30}):\s*([A-Za-z0-9][^.!?\n]{15,}[.!?]?)/g;
    while ((match = colonRegex.exec(text)) !== null && cards.length < max) {
      const term = match[1].trim();
      const explanation = match[2].trim();
      if (!/^(note|e\.g|i\.e|warning|tip|p|page|url|http)$/i.test(term)) {
        pushCard(`Explain the concept of ${term}:`, explanation);
      }
    }

    // 3. Functional patterns: "The primary function / role of X is Y"
    const funcRegex = /(?:The\s+)?(?:primary|main|key)?\s*(?:function|role|purpose|objective)\s+of\s+([A-Z][a-zA-Z0-9\s/_-]{2,30})\s+(?:is|are)\s+to\s+([^.!?]+[.!?])/gi;
    while ((match = funcRegex.exec(clean)) !== null && cards.length < max) {
      const term = match[1].trim();
      const role = match[2].trim();
      pushCard(`What is the primary function of ${term}?`, `The function of ${term} is to ${role}`);
    }

    // 4. Differences / Comparisons
    const diffRegex = /(?:The\s+)?difference\s+between\s+([A-Za-z0-9\s/_-]{2,25})\s+and\s+([A-Za-z0-9\s/_-]{2,25})\s+(?:is|lies in)\s+([^.!?]+[.!?])/gi;
    while ((match = diffRegex.exec(clean)) !== null && cards.length < max) {
      pushCard(`What is the key difference between ${match[1].trim()} and ${match[2].trim()}?`, match[3].trim());
    }

    // 5. Existing questions
    const qRegex = /([A-Z][^?]{8,80}\?)\s*([A-Z][^.!?\n]+[.!?])/g;
    while ((match = qRegex.exec(clean)) !== null && cards.length < max) {
      pushCard(match[1].trim(), match[2].trim());
    }

    // 6. High-yield declarative sentences
    if (cards.length < max) {
      const sentences = clean
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 35 && s.length <= 250);

      for (const s of sentences) {
        if (cards.length >= max) break;
        const stripped = s.replace(/[.?!]+$/, "");
        const isDefinition = /\b(is|are|was|were|describes|contains|provides)\b/i.exec(stripped);
        if (isDefinition && isDefinition.index > 3 && isDefinition.index < 45) {
          const subject = stripped.slice(0, isDefinition.index).trim();
          const predicate = stripped.slice(isDefinition.index).trim();
          if (subject.length > 2 && subject.length < 35 && !/^(it|they|this|that|these|there|we|you)$/i.test(subject)) {
            pushCard(`What is the definition or role of ${subject}?`, `${subject} ${predicate}.`);
            continue;
          }
        }
        const words = stripped.split(/\s+/);
        if (words.length >= 5) {
          const lead = words.slice(0, Math.min(4, words.length)).join(" ");
          pushCard(`Key takeaway regarding "${lead}...":`, stripped + ".");
        }
      }
    }

    if (cards.length === 0 && clean.length > 10) {
      cards.push({
        q: "What is the core idea in these notes?",
        a: clean.slice(0, 260) + (clean.length > 260 ? "..." : "")
      });
    }

    return cards.slice(0, max);
  }

  function showStatus(msg, isAi = false) {
    if (!status) return;
    if (isAi) {
      status.innerHTML = `<span class="status-badge ai">⚡ Gemini AI</span> ${escapeHtml(msg)}`;
    } else {
      status.textContent = msg;
    }
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  // Render cards with full in-place editing, deleting, and actions
  function render(cards, meta) {
    out.innerHTML = "";
    if (!cards || !cards.length) {
      out.innerHTML = '<p class="empty">Paste a block of notes or drop a PDF above, then click Generate flashcards.</p>';
      if (studyContainer) studyContainer.classList.remove("active");
      if (ankiPreviewContainer) ankiPreviewContainer.innerHTML = "";
      return;
    }

    if (meta) {
      window.__deckMeta = meta;
    }
    const currentMeta = window.__deckMeta || null;
    let badgeHtml = "";
    if (currentMeta && currentMeta.requestedCount) {
      const req = currentMeta.requestedCount;
      const actual = cards.length;
      if (actual > req) {
        badgeHtml = `<span class="deck-badge-pill expanded" title="Topic is extensive; cards automatically expanded to avoid omitting essential facts">✦ ${actual} cards in deck (expanded from ${req} for full coverage)</span>`;
      } else if (actual < req) {
        badgeHtml = `<span class="deck-badge-pill concise" title="Topic is focused; created maximum high-yield cards without filler">✦ ${actual} cards in deck (max facts, no filler)</span>`;
      } else {
        badgeHtml = `<span class="deck-badge-pill matched">✦ ${actual} cards in deck</span>`;
      }
    } else {
      badgeHtml = `<span class="deck-badge-pill matched">✦ ${cards.length} cards in deck</span>`;
    }

    // Top action bar
    const bar = document.createElement("div");
    bar.className = "deck-toolbar";
    bar.innerHTML = `
      <div class="deck-summary">
        <strong>${cards.length} cards in deck</strong>
        ${badgeHtml}
        <span class="deck-hint-sub">— click any card to edit</span>
      </div>
      <div class="deck-buttons">
        <button type="button" class="btn ghost btn-sm" id="btn-add-card" style="padding:6px 12px;font-size:14px;">+ Add Card</button>
        <button type="button" class="btn ghost btn-sm" id="btn-study-mode" style="padding:6px 12px;font-size:14px;">🎴 Study Flip Mode</button>
        <button type="button" class="btn ghost btn-sm" id="btn-copy-anki" style="padding:6px 12px;font-size:14px;">📋 Copy for Anki</button>
      </div>
    `;
    out.appendChild(bar);

    // Bind bar buttons
    bar.querySelector("#btn-add-card").addEventListener("click", () => {
      window.__cards.push({ q: "New Question", a: "New Answer" });
      if (window.__deckMeta) window.__deckMeta.actualCount = window.__cards.length;
      render(window.__cards, window.__deckMeta);
      showStatus(`New card added. ${window.__cards.length} cards in deck.`);
    });

    bar.querySelector("#btn-study-mode").addEventListener("click", () => {
      toggleStudyMode();
    });

    bar.querySelector("#btn-copy-anki").addEventListener("click", () => {
      copyToAnkiClipboard();
    });

    // Render individual card articles
    cards.forEach((c, idx) => {
      const el = document.createElement("article");
      el.className = "card";
      el.innerHTML = `
        <div class="card-header">
          <span class="card-badge">Card ${idx + 1}</span>
          <div class="card-tools">
            <button type="button" class="btn-icon danger" data-delete="${idx}" title="Delete card">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
              Delete
            </button>
          </div>
        </div>
        <div class="card-field">
          <label for="card-q-${idx}">Front (Question)</label>
          <textarea id="card-q-${idx}" data-idx="${idx}" data-field="q" rows="2">${escapeHtml(c.q)}</textarea>
        </div>
        <div class="card-field">
          <label for="card-a-${idx}">Back (Answer)</label>
          <textarea id="card-a-${idx}" data-idx="${idx}" data-field="a" rows="3">${escapeHtml(c.a)}</textarea>
        </div>
      `;

      // Live update sync
      el.querySelectorAll("textarea").forEach((input) => {
        input.addEventListener("input", (e) => {
          const i = parseInt(e.target.dataset.idx, 10);
          const field = e.target.dataset.field;
          if (window.__cards[i]) {
            window.__cards[i][field] = e.target.value;
          }
          if (ankiPreviewContainer) renderAnkiPreview();
        });
      });

      // Delete card
      el.querySelector("[data-delete]").addEventListener("click", (e) => {
        const i = parseInt(e.currentTarget.dataset.delete, 10);
        window.__cards.splice(i, 1);
        if (window.__deckMeta) window.__deckMeta.actualCount = window.__cards.length;
        render(window.__cards, window.__deckMeta);
        showStatus(`Card removed. ${window.__cards.length} cards in deck.`);
      });

      out.appendChild(el);
    });

    if (ankiPreviewContainer) renderAnkiPreview();
  }

  // Interactive Flip / Study Mode
  function toggleStudyMode() {
    if (!studyContainer) return;
    if (studyContainer.classList.contains("active")) {
      studyContainer.classList.remove("active");
      return;
    }
    if (!window.__cards || !window.__cards.length) {
      showStatus("Generate flashcards first to start Study Mode.");
      return;
    }
    studyContainer.classList.add("active");
    currentStudyIndex = 0;
    isStudyFlipped = false;
    updateStudyView();
    studyContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function updateStudyView() {
    if (!studyContainer || !window.__cards.length) return;
    const card = window.__cards[currentStudyIndex];
    const textEl = document.getElementById("study-text");
    const tagEl = document.getElementById("study-tag");
    const hintEl = document.getElementById("study-hint");
    const progEl = document.getElementById("study-progress");

    if (isStudyFlipped) {
      if (tagEl) tagEl.textContent = "Back (Answer)";
      if (textEl) {
        textEl.textContent = card.a;
        textEl.className = "study-text answer-text";
      }
      if (hintEl) hintEl.textContent = "Click card to flip back to question";
    } else {
      if (tagEl) tagEl.textContent = "Front (Question)";
      if (textEl) {
        textEl.textContent = card.q;
        textEl.className = "study-text";
      }
      if (hintEl) hintEl.textContent = "Click card or press Space to reveal answer";
    }

    if (progEl) {
      progEl.textContent = `${currentStudyIndex + 1} of ${window.__cards.length}`;
    }
  }

  // Bind Study Card Click & Nav
  const studyCardView = document.getElementById("study-card-view");
  if (studyCardView) {
    studyCardView.addEventListener("click", () => {
      isStudyFlipped = !isStudyFlipped;
      updateStudyView();
    });
  }

  const prevBtn = document.getElementById("study-prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!window.__cards.length) return;
      currentStudyIndex = (currentStudyIndex - 1 + window.__cards.length) % window.__cards.length;
      isStudyFlipped = false;
      updateStudyView();
    });
  }

  const nextBtn = document.getElementById("study-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!window.__cards.length) return;
      currentStudyIndex = (currentStudyIndex + 1) % window.__cards.length;
      isStudyFlipped = false;
      updateStudyView();
    });
  }

  const flipBtn = document.getElementById("study-flip-btn");
  if (flipBtn) {
    flipBtn.addEventListener("click", () => {
      isStudyFlipped = !isStudyFlipped;
      updateStudyView();
    });
  }

  const closeStudyBtn = document.getElementById("study-close-btn");
  if (closeStudyBtn) {
    closeStudyBtn.addEventListener("click", () => {
      if (studyContainer) studyContainer.classList.remove("active");
    });
  }

  // Keyboard navigation for Study Mode
  window.addEventListener("keydown", (e) => {
    if (!studyContainer || !studyContainer.classList.contains("active")) return;
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      isStudyFlipped = !isStudyFlipped;
      updateStudyView();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (nextBtn) nextBtn.click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (prevBtn) prevBtn.click();
    }
  });

  // RFC 4180 CSV builder
  function toCsv(cards) {
    const rows = [["Front", "Back"]].concat(cards.map((c) => [c.q, c.a]));
    return "\uFEFF" + rows.map((r) => r.map((cell) => '"' + String(cell || "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
  }

  // TSV for Anki direct import / clipboard
  function toTsv(cards) {
    return cards.map((c) => {
      const q = String(c.q || "").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
      const a = String(c.a || "").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
      return `${q}\t${a}`;
    }).join("\n");
  }

  // Copy to Clipboard for Anki
  function copyToAnkiClipboard() {
    const cards = window.__cards || [];
    if (!cards.length) {
      showStatus("Generate cards first before copying.");
      return;
    }
    const tsvData = toTsv(cards);
    navigator.clipboard.writeText(tsvData).then(() => {
      showStatus(`✓ Copied ${cards.length} cards (Tab-separated) to clipboard! Ready to paste into Anki.`, true);
    }).catch(() => {
      showStatus("Clipboard access denied. Please use the Export CSV button instead.");
    });
  }

  // Render Live Anki Preview Table (for anki-export.html)
  function renderAnkiPreview() {
    if (!ankiPreviewContainer) return;
    const cards = window.__cards || [];
    if (!cards.length) {
      ankiPreviewContainer.innerHTML = '<p class="hint">Generate or paste notes above to preview the Anki card columns.</p>';
      return;
    }
    let html = `
      <div class="anki-table-wrap">
        <table class="anki-table">
          <thead>
            <tr>
              <th style="width: 80px">#</th>
              <th>Front (Anki Field 1)</th>
              <th>Back (Anki Field 2)</th>
            </tr>
          </thead>
          <tbody>
    `;
    cards.forEach((c, idx) => {
      html += `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td>${escapeHtml(c.q)}</td>
          <td>${escapeHtml(c.a)}</td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
    ankiPreviewContainer.innerHTML = html;
  }

  // Clean YouTube transcript text (removes timestamps, music/audio tags, speaker tags)
  function cleanYouTubeTranscript(text) {
    if (!text || typeof text !== "string") return "";
    return text
      // Remove timestamps like [00:15], 0:14, 12:45, 01:23:45
      .replace(/\[?\b\d{1,2}:\d{2}(?::\d{2})?\b\]?/g, " ")
      // Remove subtitle audio markers like [Music], [Applause], [Laughter]
      .replace(/\[(?:music|applause|laughter|silence|audio|chuckles|groan)\]/gi, " ")
      .replace(/\((?:music|applause|laughter|silence|audio|chuckles)\)/gi, " ")
      // Remove speaker prefixes like "Speaker 1:", "Host:", "Dr. Smith:"
      .replace(/^[A-Z][a-zA-Z\s.]{1,20}:\s*/gm, "")
      // Clean excessive whitespace and join short speech lines into flowing sentences
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Generation Handler
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const rawText = source.value.trim();
    if (!rawText) {
      showStatus("Please paste notes, enter a transcript, or upload a file first.");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "Generate flashcards";

    // Intercept bare YouTube URLs: YouTube requires transcript text, not a bare link
    const ytUrlRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch|embed|v|shorts))\S*$/i;
    if (ytUrlRegex.test(rawText)) {
      showStatus("⚠️ Please paste the video's transcript instead of just the link. In YouTube, click '...More' below the video and choose 'Show transcript', then copy and paste the captions here.");
      return;
    }

    const n = Number(countEl && countEl.value ? countEl.value : 12);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Generating cards...';
    }
    showStatus("Processing notes and drafting high-yield cards...");

    // Auto-clean transcript if it contains timestamps or typical caption formatting
    let textToProcess = rawText;
    if (/\b\d{1,2}:\d{2}\b/.test(rawText) || /\[music\]/i.test(rawText)) {
      const cleaned = cleanYouTubeTranscript(rawText);
      if (cleaned.length > 30) {
        textToProcess = cleaned;
        source.value = cleaned;
        showStatus("Cleaned timestamps and speech markers from transcript. Generating cards...");
      }
    }

    // Call server-side /api/generate-cards
    try {
      const res = await fetch("/api/generate-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToProcess,
          count: n,
          topic: document.title || ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.cards && data.cards.length > 0) {
          window.__cards = data.cards;
          const req = data.requestedCount || n;
          const actual = data.cards.length;
          window.__deckMeta = {
            requestedCount: req,
            actualCount: actual,
            model: data.model
          };
          render(window.__cards, window.__deckMeta);
          const isAi = data.model && data.model !== "heuristic";

          let statusMsg = "";
          if (actual > req) {
            statusMsg = `✓ ${actual} cards in deck (expanded from your target of ${req} to thoroughly cover this extensive topic).`;
          } else if (actual < req) {
            statusMsg = `✓ ${actual} cards in deck (maximum high-yield cards extracted from notes — no filler added).`;
          } else {
            statusMsg = `✓ ${actual} cards in deck ready. Click any card to edit or export to Anki.`;
          }
          showStatus(statusMsg, isAi);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Server generation failed, using local extraction fallback:", err);
    }

    // Client-side fallback
    const fallbackCards = extractHeuristicCards(textToProcess, n);
    window.__cards = fallbackCards;
    const actual = fallbackCards.length;
    window.__deckMeta = {
      requestedCount: n,
      actualCount: actual,
      model: "heuristic"
    };
    render(fallbackCards, window.__deckMeta);
    let fallbackMsg = "";
    if (actual > n) {
      fallbackMsg = `${actual} cards in deck (expanded to capture key points). Click any card to edit.`;
    } else if (actual > 0 && actual < n) {
      fallbackMsg = `${actual} cards in deck (maximum high-yield cards extracted without filler). Click any card to edit.`;
    } else if (actual === n) {
      fallbackMsg = `${actual} cards in deck ready. Click any card to edit or export to Anki.`;
    } else {
      fallbackMsg = "Could not find enough distinct facts in the notes. Try adding more sentences or key terms.";
    }
    showStatus(fallbackMsg, false);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });

  // Export CSV button
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      const cards = window.__cards || [];
      if (!cards.length) {
        showStatus("Generate flashcards first before exporting.");
        return;
      }
      const csvString = toCsv(cards);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tool-genie-anki-deck.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      showStatus(`✓ Exported ${cards.length} cards to tool-genie-anki-deck.csv. Import into Anki as Front/Back.`);
    });
  }

  // Clear All / Reset button
  const clearBtn = document.getElementById("btn-clear-all");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (source) {
        source.value = "";
      }
      if (pdfFileInput) {
        pdfFileInput.value = "";
      }
      if (fileBanner) {
        fileBanner.style.display = "none";
      }
      if (dropzone) {
        dropzone.style.display = "block";
      }
      window.__cards = [];
      render([]);
      if (studyContainer) {
        studyContainer.classList.remove("active");
      }
      if (ankiPreviewContainer) {
        ankiPreviewContainer.innerHTML = "";
      }
      showStatus("All cleared. Ready for new notes or PDF.");
      if (source) {
        source.focus();
      }
    });
  }

  // --- PDF DRAG & DROP AND FILE BROWSER HANDLING ---
  if (dropzone && pdfFileInput) {
    // Click on dropzone opens file picker
    dropzone.addEventListener("click", (e) => {
      if (e.target !== pdfFileInput) {
        pdfFileInput.click();
      }
    });

    // Drag over styling
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("dragover");
      });
    });

    // File Drop Handler
    dropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    });

    // File Browser Input Handler
    pdfFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    // Remove File button
    if (removeFileBtn) {
      removeFileBtn.addEventListener("click", () => {
        if (pdfFileInput) pdfFileInput.value = "";
        if (fileBanner) fileBanner.style.display = "none";
        if (dropzone) dropzone.style.display = "block";
        if (source) source.value = "";
        window.__cards = [];
        render([]);
        showStatus("File cleared. Upload another document or paste notes.");
      });
    }
  }

  // Unified File Handler for PDFs, Text files, and Markdown notes
  async function handleFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();

    // 1. Text & Markdown notes (.txt, .md, .text, .rtf, text/*)
    if (
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".text") ||
      name.endsWith(".csv") ||
      file.type.startsWith("text/")
    ) {
      showStatus(`Reading notes from ${file.name} (${Math.round(file.size / 1024)} KB)...`);
      try {
        const textContent = await file.text();
        const cleanedText = textContent.trim();
        if (!cleanedText || cleanedText.length < 20) {
          showStatus("The selected file is empty or too short. Please provide notes with more text.");
          return;
        }

        if (source) source.value = cleanedText;
        if (fileBanner) fileBanner.style.display = "flex";
        if (dropzone) dropzone.style.display = "none";
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (filePagesEl) filePagesEl.textContent = `Text notes • ${Math.round(file.size / 1024)} KB`;

        showStatus(`Loaded notes from ${file.name}. Creating flashcards now...`);
        form.dispatchEvent(new Event("submit"));
      } catch (err) {
        showStatus("Error reading text file: " + err.message);
      }
      return;
    }

    // 2. PDF Documents
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      await handlePdfFile(file);
      return;
    }

    showStatus("Please upload a PDF (.pdf) or text notes file (.txt, .md).");
  }

  // Process PDF File using PDF.js
  async function handlePdfFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      showStatus("Please upload a PDF file (.pdf).");
      return;
    }

    showStatus(`Reading PDF: ${file.name} (${Math.round(file.size / 1024)} KB)...`);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Ensure PDF.js is loaded
      if (typeof window.pdfjsLib === "undefined") {
        showStatus("Loading PDF extraction engine...");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
      }

      if (!window.pdfjsLib) {
        throw new Error("PDF processing library could not be loaded.");
      }

      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      showStatus(`Extracting text from ${numPages} page${numPages > 1 ? "s" : ""}...`);

      let fullText = "";
      for (let i = 1; i <= numPages; i++) {
        showStatus(`Extracting page ${i} of ${numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => item.str)
          .join(" ")
          .replace(/\s+/g, " ");
        fullText += `\n--- Page ${i} ---\n` + pageText;
      }

      const cleanedText = fullText.trim();
      if (!cleanedText || cleanedText.length < 30) {
        showStatus("Could not extract readable text from this PDF. It may be a scanned image without OCR.");
        return;
      }

      // Populate text into source textarea
      if (source) {
        source.value = cleanedText;
      }

      // Show File Banner and hide dropzone
      if (fileBanner) {
        fileBanner.style.display = "flex";
      }
      if (dropzone) {
        dropzone.style.display = "none";
      }
      if (fileNameEl) {
        fileNameEl.textContent = file.name;
      }
      if (filePagesEl) {
        filePagesEl.textContent = `${numPages} page${numPages > 1 ? "s" : ""} • ${Math.round(file.size / 1024)} KB`;
      }

      showStatus(`Extracted ${cleanedText.length} characters from ${numPages} pages. Creating flashcards now...`);

      // Automatically trigger flashcard generation for convenience
      form.dispatchEvent(new Event("submit"));

    } catch (err) {
      console.error("PDF extraction error:", err);
      showStatus("Error reading PDF: " + err.message + ". You can copy text from the PDF and paste it below.");
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error("Failed to load script: " + src));
      document.head.appendChild(s);
    });
  }

})();
