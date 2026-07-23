const select = document.getElementById("target-lang");
const status = document.getElementById("status");

function showStatus(message) {
  status.textContent = message;
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

function populateLanguages(selectedCode) {
  select.innerHTML = "";

  for (const lang of SVC_LANGUAGES) {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.label;
    if (lang.code === selectedCode) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(SVC_STORAGE_KEY);
  const targetLang = stored[SVC_STORAGE_KEY] || SVC_DEFAULT_TARGET_LANG;
  populateLanguages(targetLang);
}

select.addEventListener("change", async () => {
  const targetLang = select.value;
  await chrome.storage.sync.set({ [SVC_STORAGE_KEY]: targetLang });
  showStatus(`${getLanguageLabel(targetLang)} kaydedildi`);
});

loadSettings();
