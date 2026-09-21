/**
 * OmniGrab - Settings & Options Page Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const defaultQuality = document.getElementById('defaultQuality');
  const defaultAudioFormat = document.getElementById('defaultAudioFormat');
  const defaultMode = document.getElementById('defaultMode');
  const saveAsPrompt = document.getElementById('saveAsPrompt');
  const autoScanTabs = document.getElementById('autoScanTabs');
  const customInstance = document.getElementById('customInstance');
  const saveBtn = document.getElementById('saveBtn');
  const themeChips = document.querySelectorAll('.theme-chip');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  let selectedTheme = 'system';

  // 1. Load Stored Settings
  const { settings } = await chrome.storage.local.get('settings');
  if (settings) {
    if (settings.defaultQuality) defaultQuality.value = settings.defaultQuality;
    if (settings.defaultAudioFormat) defaultAudioFormat.value = settings.defaultAudioFormat;
    if (settings.defaultMode) defaultMode.value = settings.defaultMode;
    if (typeof settings.saveAsPrompt === 'boolean') saveAsPrompt.checked = settings.saveAsPrompt;
    if (typeof settings.autoScanTabs === 'boolean') autoScanTabs.checked = settings.autoScanTabs;
    if (settings.customInstance) customInstance.value = settings.customInstance;
    
    if (settings.theme) {
      selectedTheme = settings.theme;
      applyTheme(selectedTheme);
    }
  }

  function applyTheme(theme) {
    themeChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.theme === theme);
    });
    document.body.className = `theme-${theme}`;
  }

  themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      selectedTheme = chip.dataset.theme;
      applyTheme(selectedTheme);
    });
  });

  // 2. Save Settings
  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      defaultQuality: defaultQuality.value,
      defaultAudioFormat: defaultAudioFormat.value,
      defaultMode: defaultMode.value,
      saveAsPrompt: saveAsPrompt.checked,
      autoScanTabs: autoScanTabs.checked,
      customInstance: customInstance.value.trim(),
      theme: selectedTheme
    };

    await chrome.storage.local.set({ settings: newSettings });
    showToast('Einstellungen erfolgreich gespeichert!');
  });

  function showToast(msg) {
    toastMessage.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2800);
  }
});
