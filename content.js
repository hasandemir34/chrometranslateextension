(() => {
  const MIN_LENGTH = 1;
  const MAX_LENGTH = 500;
  const ROOT_ID = "sec-ve-cevir-root";

  let shadowRoot = null;
  let popup = null;
  let langSelect = null;
  let currentRequestId = 0;
  let isSelecting = false;
  let pendingCheckTimer = null;
  let targetLang = SVC_DEFAULT_TARGET_LANG;
  let lastTranslatedText = "";

  function getHost() {
    let host = document.getElementById(ROOT_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = ROOT_ID;
      host.style.cssText =
        "all:initial;position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none;";
      (document.body || document.documentElement).appendChild(host);
      shadowRoot = host.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = `
        :host { all: initial; }
        .svc-popup {
          position: fixed;
          z-index: 2147483647;
          width: min(340px, calc(100vw - 24px));
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.45;
          color: #111827;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08);
          opacity: 0;
          transform: translateY(4px);
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          box-sizing: border-box;
        }
        .svc-popup.svc-visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .svc-popup * { box-sizing: border-box; }
        .svc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px 8px;
          border-bottom: 1px solid #f3f4f6;
        }
        .svc-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }
        .svc-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #2563eb;
          white-space: nowrap;
        }
        .svc-lang {
          flex: 1;
          min-width: 0;
          max-width: 170px;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 12px;
          color: #111827;
          background: #ffffff;
          cursor: pointer;
        }
        .svc-lang:focus {
          outline: 2px solid #2563eb;
          outline-offset: 1px;
        }
        .svc-close {
          all: unset;
          cursor: pointer;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: #6b7280;
          font-size: 18px;
          line-height: 1;
          flex-shrink: 0;
        }
        .svc-close:hover { background: #f3f4f6; color: #111827; }
        .svc-body { padding: 10px 12px 12px; }
        .svc-loading { color: #6b7280; font-style: italic; }
        .svc-meta-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }
        .svc-meta { margin: 0; font-size: 11px; font-weight: 600; color: #6b7280; }
        .svc-save-btn {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #f9fafb;
          color: #374151;
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
        }
        .svc-save-btn:hover {
          background: #f3f4f6;
          border-color: #c4c9d0;
          color: #111827;
        }
        .svc-save-btn:active {
          transform: scale(0.95);
        }
        .svc-save-btn.svc-loading {
          opacity: 0.6;
          pointer-events: none;
          background: #f3f4f6;
          color: #6b7280;
        }
        .svc-save-btn.svc-success {
          background: #10b981;
          border-color: #10b981;
          color: #ffffff;
        }
        .svc-save-btn.svc-success:hover {
          background: #059669;
          border-color: #059669;
        }
        .svc-save-err-msg {
          color: #dc2626;
          font-size: 11px;
          margin-top: 6px;
          text-align: right;
        }
        .svc-translation { font-size: 15px; font-weight: 600; color: #111827; word-break: break-word; }
        .svc-original-label { margin-top: 10px; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #9ca3af; }
        .svc-original { font-size: 13px; color: #4b5563; word-break: break-word; }
        .svc-note { margin-bottom: 8px; font-size: 13px; color: #059669; }
        .svc-error { color: #dc2626; font-size: 13px; }
      `;
      shadowRoot.appendChild(style);
    } else if (!shadowRoot) {
      shadowRoot = host.shadowRoot;
    }
    return host;
  }

  function populateLangSelect(select, selectedCode) {
    select.innerHTML = "";
    for (const lang of SVC_LANGUAGES) {
      const option = document.createElement("option");
      option.value = lang.code;
      option.textContent = lang.label;
      option.selected = lang.code === selectedCode;
      select.appendChild(option);
    }
  }

  function ensurePopup() {
    getHost();
    if (!popup) {
      popup = document.createElement("div");
      popup.className = "svc-popup";
      popup.setAttribute("role", "status");
      popup.innerHTML = `
        <div class="svc-header">
          <div class="svc-header-left">
            <span class="svc-title">Çeviri</span>
            <select class="svc-lang" aria-label="Hedef dil"></select>
          </div>
          <button type="button" class="svc-close" aria-label="Kapat">×</button>
        </div>
        <div class="svc-body">
          <div class="svc-loading">Çevriliyor...</div>
        </div>
      `;

      langSelect = popup.querySelector(".svc-lang");
      populateLangSelect(langSelect, targetLang);

      langSelect.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });
      langSelect.addEventListener("change", async () => {
        targetLang = langSelect.value;
        await chrome.storage.sync.set({ [SVC_STORAGE_KEY]: targetLang });
        if (lastTranslatedText) {
          requestTranslation(lastTranslatedText);
        }
      });

      popup.querySelector(".svc-close").addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      popup.querySelector(".svc-close").addEventListener("click", (event) => {
        event.stopPropagation();
        hidePopup();
      });
      shadowRoot.appendChild(popup);
    } else if (langSelect) {
      langSelect.value = targetLang;
    }
    return popup;
  }

  async function loadTargetLang() {
    const stored = await chrome.storage.sync.get(SVC_STORAGE_KEY);
    targetLang = stored[SVC_STORAGE_KEY] || SVC_DEFAULT_TARGET_LANG;
    if (langSelect) {
      langSelect.value = targetLang;
    }
  }

  function hidePopup() {
    if (popup) {
      popup.classList.remove("svc-visible");
      const body = popup.querySelector(".svc-body");
      if (body) {
        body.innerHTML = '<div class="svc-loading">Çevriliyor...</div>';
      }
    }
    lastTranslatedText = "";
  }

  function setPopupContent(html) {
    ensurePopup().querySelector(".svc-body").innerHTML = html;
  }

  function getSelectionRect(selection) {
    if (!selection.rangeCount) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const primary = range.getBoundingClientRect();
    if (primary.width > 0 || primary.height > 0) {
      return primary;
    }

    const rects = range.getClientRects();
    for (let i = rects.length - 1; i >= 0; i -= 1) {
      const rect = rects[i];
      if (rect.width > 0 || rect.height > 0) {
        return rect;
      }
    }

    return primary;
  }

  function positionPopup(rect) {
    const el = ensurePopup();
    el.classList.add("svc-visible");

    const margin = 10;
    el.style.visibility = "hidden";
    el.style.top = "0px";
    el.style.left = "0px";

    const popupRect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + margin;
    let left = rect.left;

    if (top + popupRect.height > viewportHeight - margin) {
      top = rect.top - popupRect.height - margin;
    }
    if (top < margin) {
      top = margin;
    }
    if (left + popupRect.width > viewportWidth - margin) {
      left = viewportWidth - popupRect.width - margin;
    }
    if (left < margin) {
      left = margin;
    }

    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.visibility = "visible";
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function handleSaveWord(btn, word, translation, sourceLang, targetLang) {
    btn.classList.add("svc-loading");
    btn.textContent = "Kaydediliyor...";

    const errContainer = popup.querySelector(".svc-save-err-msg");
    if (errContainer) {
      errContainer.style.display = "none";
      errContainer.textContent = "";
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_WORD",
        word,
        translation,
        sourceLang,
        targetLang,
      });

      if (response?.ok) {
        btn.classList.remove("svc-loading");
        btn.classList.add("svc-success");
        btn.textContent = "Kaydedildi ✔";
      } else {
        throw new Error(response?.error || "Kaydetme başarısız oldu");
      }
    } catch (error) {
      btn.classList.remove("svc-loading");
      btn.textContent = "➕ Deftere Ekle";
      if (errContainer) {
        errContainer.textContent = error.message || "Kaydetme başarısız oldu";
        errContainer.style.display = "block";
      }
    }
  }

  async function requestTranslation(text) {
    const requestId = ++currentRequestId;
    lastTranslatedText = text;
    setPopupContent('<div class="svc-loading">Çevriliyor...</div>');

    try {
      const response = await chrome.runtime.sendMessage({
        type: "TRANSLATE",
        text,
        targetLang,
      });

      if (requestId !== currentRequestId) {
        return;
      }

      if (!response?.ok) {
        throw new Error(response?.error || "Çeviri alınamadı");
      }

      const { translated, detectedLang } = response;
      const targetLabel = getLanguageLabel(targetLang);

      if (
        detectedLang === targetLang &&
        translated.trim().toLowerCase() === text.trim().toLowerCase()
      ) {
        setPopupContent(`
          <div class="svc-note">Metin zaten ${escapeHtml(targetLabel)} görünüyor.</div>
          <div class="svc-original">${escapeHtml(text)}</div>
        `);
        return;
      }

      setPopupContent(`
        <div class="svc-meta-container">
          <div class="svc-meta">${escapeHtml(getLanguageLabel(detectedLang))} → ${escapeHtml(targetLabel)}</div>
          <button type="button" class="svc-save-btn">➕ Deftere Ekle</button>
        </div>
        <div class="svc-translation">${escapeHtml(translated)}</div>
        <div class="svc-original-label">Orijinal</div>
        <div class="svc-original">${escapeHtml(text)}</div>
        <div class="svc-save-err-msg" style="display: none;"></div>
      `);

      const saveBtn = popup.querySelector(".svc-save-btn");
      if (saveBtn) {
        saveBtn.addEventListener("mousedown", (event) => {
          event.stopPropagation();
        });
        saveBtn.addEventListener("click", async (event) => {
          event.stopPropagation();
          await handleSaveWord(saveBtn, text, translated, detectedLang, targetLang);
        });

        // Check if word already exists in Firestore
        chrome.runtime.sendMessage({ type: "CHECK_WORD_EXISTS", word: text }, (res) => {
          if (res?.ok && res.exists && popup && requestId === currentRequestId) {
            saveBtn.classList.add("svc-success");
            saveBtn.textContent = "✔ Defterde Var";
          }
        });
      }
    } catch (error) {
      if (requestId !== currentRequestId) {
        return;
      }

      const message =
        error?.message === "Could not establish connection. Receiving end does not exist."
          ? "Eklenti arka planı yanıt vermiyor. Eklentiyi yeniden yükleyin."
          : error?.message || "Çeviri başarısız oldu";

      setPopupContent(`<div class="svc-error">${escapeHtml(message)}</div>`);
    }
  }

  function isExtensionEvent(eventOrNode) {
    const host = document.getElementById(ROOT_ID);
    if (!host) {
      return false;
    }

    if (eventOrNode?.composedPath) {
      return eventOrNode.composedPath().includes(host);
    }

    const node = eventOrNode;
    if (!node) {
      return false;
    }
    return node === host || host.contains(node);
  }

  function handleSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    if (
      isExtensionEvent(selection.anchorNode) ||
      isExtensionEvent(selection.focusNode)
    ) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
      hidePopup();
      return;
    }

    const rect = getSelectionRect(selection);
    if (!rect) {
      hidePopup();
      return;
    }

    positionPopup(rect);
    requestTranslation(text);
  }

  function scheduleSelectionCheck() {
    clearTimeout(pendingCheckTimer);
    pendingCheckTimer = setTimeout(() => {
      requestAnimationFrame(handleSelection);
    }, 20);
  }

  loadTargetLang();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[SVC_STORAGE_KEY]) {
      return;
    }
    targetLang = changes[SVC_STORAGE_KEY].newValue || SVC_DEFAULT_TARGET_LANG;
    if (langSelect) {
      langSelect.value = targetLang;
    }
    if (lastTranslatedText && popup?.classList.contains("svc-visible")) {
      requestTranslation(lastTranslatedText);
    }
  });

  document.addEventListener(
    "mousedown",
    (event) => {
      if (event.button !== 0 || isExtensionEvent(event)) {
        return;
      }
      isSelecting = true;
      hidePopup();
    },
    true
  );

  document.addEventListener(
    "mouseup",
    (event) => {
      if (event.button !== 0) {
        return;
      }
      if (isSelecting) {
        isSelecting = false;
        scheduleSelectionCheck();
      }
    },
    true
  );

  document.addEventListener(
    "selectionchange",
    () => {
      if (isSelecting) {
        return;
      }
      scheduleSelectionCheck();
    },
    true
  );

  document.addEventListener(
    "keyup",
    (event) => {
      if (event.shiftKey || event.key === "Shift" || event.key.startsWith("Arrow")) {
        scheduleSelectionCheck();
      }
    },
    true
  );

  document.addEventListener("scroll", hidePopup, true);
  window.addEventListener("resize", hidePopup);
})();
