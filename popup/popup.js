/**
 * OmniGrab - Popup Logic (Google Material Design 3)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // UI Element References
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // Download Tab Elements
  const activeTabCard = document.getElementById('activeTabCard');
  const platformBadge = document.getElementById('platformBadge');
  const activeTabTitle = document.getElementById('activeTabTitle');
  const useActiveTabBtn = document.getElementById('useActiveTabBtn');
  
  const urlInput = document.getElementById('urlInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  
  const segmentBtns = document.querySelectorAll('.segment-btn');
  const videoQualitySection = document.getElementById('videoQualitySection');
  const audioFormatSection = document.getElementById('audioFormatSection');
  const videoQualityChips = document.querySelectorAll('#videoQualityChips .filter-chip');
  const audioFormatChips = document.querySelectorAll('#audioFormatChips .filter-chip');
  const muteVideoCheckbox = document.getElementById('muteVideoCheckbox');
  
  const downloadBtn = document.getElementById('downloadBtn');
  const btnSpinner = downloadBtn.querySelector('.btn-spinner');
  const btnText = downloadBtn.querySelector('.btn-text');
  const statusBanner = document.getElementById('statusBanner');
  const statusMessage = document.getElementById('statusMessage');
  const statusIcon = document.getElementById('statusIcon');
  
  // Sniffer Tab Elements
  const snifferCountBadge = document.getElementById('snifferCountBadge');
  const snifferList = document.getElementById('snifferList');
  const snifferEmpty = document.getElementById('snifferEmpty');
  const snifferLoading = document.getElementById('snifferLoading');
  const rescanBtn = document.getElementById('rescanBtn');

  // History Tab Elements
  const historyList = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  // State
  let currentTabInfo = null;
  let activeMode = 'auto'; // 'auto' (video) or 'audio'
  let selectedVideoQuality = '1080';
  let selectedAudioFormat = 'mp3';

  // --- 1. Load Settings & Theme ---
  const { settings } = await chrome.storage.local.get('settings');
  if (settings) {
    if (settings.theme && settings.theme !== 'system') {
      document.body.className = `theme-${settings.theme}`;
    }
    if (settings.defaultQuality) {
      selectedVideoQuality = settings.defaultQuality;
      updateActiveChip(videoQualityChips, selectedVideoQuality);
    }
    if (settings.defaultAudioFormat) {
      selectedAudioFormat = settings.defaultAudioFormat;
      updateActiveChip(audioFormatChips, selectedAudioFormat);
    }
    if (settings.defaultMode) {
      setMode(settings.defaultMode);
    }
  }

  // --- Engine Status Check ---
  const engineBadge = document.getElementById('engineBadge');
  try {
    const engineRes = await chrome.runtime.sendMessage({ action: 'CHECK_ENGINE' });
    if (engineRes?.health?.status === 'ok') {
      if (engineBadge) {
        engineBadge.textContent = '⚡ Native Engine';
        engineBadge.className = 'brand-badge engine-active';
        engineBadge.title = 'Natives yt-dlp aktiv: Volle 2h+ Länge & 100% Ton';
      }
    } else {
      if (engineBadge) {
        engineBadge.textContent = 'Cloud Engine';
        engineBadge.className = 'brand-badge engine-cloud';
        engineBadge.title = 'Web-Streaming Engine';
      }
    }
  } catch (e) {
    if (engineBadge) engineBadge.textContent = 'Cloud Engine';
  }

  // --- 2. Theme Toggle ---
  themeToggleBtn.addEventListener('click', async () => {
    let nextTheme = 'light';
    if (document.body.classList.contains('theme-light')) {
      nextTheme = 'dark';
    } else if (document.body.classList.contains('theme-dark')) {
      nextTheme = 'system';
    } else {
      nextTheme = 'dark';
    }

    document.body.className = `theme-${nextTheme}`;
    const current = (await chrome.storage.local.get('settings')).settings || {};
    current.theme = nextTheme;
    await chrome.storage.local.set({ settings: current });
  });

  // Open Options Page
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // --- 3. Navigation Tabs ---
  navTabs.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const targetId = tabBtn.dataset.tab;
      navTabs.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      tabBtn.classList.add('active');
      document.getElementById(targetId)?.classList.add('active');

      if (targetId === 'tab-history') {
        loadHistory();
      } else if (targetId === 'tab-sniffer') {
        scanActivePageMedia();
      }
    });
  });

  // --- 4. Active Tab Detection & Inspection ---
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      currentTabInfo = tab;
      const platform = detectPlatform(tab.url);
      if (platform) {
        platformBadge.textContent = platform;
        activeTabTitle.textContent = tab.title || tab.url;
        activeTabCard.style.display = 'block';

        // Auto-fill active tab URL
        if (!urlInput.value.trim()) {
          urlInput.value = tab.url;
          clearInputBtn.style.display = 'block';
        }

        useActiveTabBtn.addEventListener('click', () => {
          urlInput.value = tab.url;
          clearInputBtn.style.display = 'block';
          showStatus(`Link von ${platform} übernommen. Klicke auf 'Herunterladen'!`, 'info');
        });
      }

      // Initial In-Page Scan
      scanActivePageMedia();
    }
  } catch (err) {
    console.warn('Could not inspect active tab:', err);
  }

  // Platform Matcher
  function detectPlatform(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
    if (/instagram\.com/i.test(url)) return 'Instagram';
    if (/tiktok\.com/i.test(url)) return 'TikTok';
    if (/twitter\.com|x\.com/i.test(url)) return 'X / Twitter';
    if (/reddit\.com/i.test(url)) return 'Reddit';
    if (/pinterest\.com/i.test(url)) return 'Pinterest';
    if (/facebook\.com|fb\.watch/i.test(url)) return 'Facebook';
    if (/soundcloud\.com/i.test(url)) return 'SoundCloud';
    if (/vimeo\.com/i.test(url)) return 'Vimeo';
    return null;
  }

  // --- 5. Input Controls ---
  urlInput.addEventListener('input', () => {
    clearInputBtn.style.display = urlInput.value.trim() ? 'block' : 'none';
  });

  clearInputBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearInputBtn.style.display = 'none';
    urlInput.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        clearInputBtn.style.display = 'block';
        const detected = detectPlatform(text);
        if (detected) {
          showStatus(`${detected}-Link eingefügt!`, 'info');
        }
      }
    } catch (err) {
      showStatus('Zwischenablage konnte nicht gelesen werden.', 'error');
    }
  });

  // --- 6. Format & Quality Controls ---
  function setMode(mode) {
    activeMode = mode;
    segmentBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'audio') {
      videoQualitySection.style.display = 'none';
      audioFormatSection.style.display = 'block';
      btnText.textContent = 'Audio herunterladen';
    } else {
      videoQualitySection.style.display = 'block';
      audioFormatSection.style.display = 'none';
      btnText.textContent = 'Video herunterladen';
    }
  }

  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  function updateActiveChip(chips, val) {
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.val === val);
    });
  }

  videoQualityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      selectedVideoQuality = chip.dataset.val;
      updateActiveChip(videoQualityChips, selectedVideoQuality);
    });
  });

  audioFormatChips.forEach(chip => {
    chip.addEventListener('click', () => {
      selectedAudioFormat = chip.dataset.val;
      updateActiveChip(audioFormatChips, selectedAudioFormat);
    });
  });

  // --- 7. Main Download Action ---
  downloadBtn.addEventListener('click', async () => {
    let rawUrl = urlInput.value.trim();
    if (!rawUrl && currentTabInfo && currentTabInfo.url) {
      rawUrl = currentTabInfo.url;
      urlInput.value = rawUrl;
      clearInputBtn.style.display = 'block';
    }

    if (!rawUrl) {
      showStatus('Bitte füge zuerst einen Link ein.', 'error');
      urlInput.focus();
      return;
    }

    try {
      new URL(rawUrl);
    } catch (e) {
      showStatus('Ungültige URL. Bitte prüfe das Format.', 'error');
      return;
    }

    // Prepare UI for download
    setLoading(true);
    showStatus('Medien werden vorbereitet...', 'info');

    try {
      const mode = activeMode === 'audio' ? 'audio' : (muteVideoCheckbox.checked ? 'mute' : 'auto');

      const response = await chrome.runtime.sendMessage({
        action: 'RESOLVE_MEDIA',
        options: {
          url: rawUrl,
          videoQuality: selectedVideoQuality,
          audioFormat: selectedAudioFormat,
          downloadMode: mode
        }
      });

      if (!response.success || !response.downloadUrl) {
        throw new Error(response.error || 'Download konnte nicht durchgeführt werden.');
      }

      // Trigger actual download via Chrome's native download manager
      const dlResponse = await chrome.runtime.sendMessage({
        action: 'START_DOWNLOAD',
        url: response.downloadUrl,
        filename: response.filename,
        title: response.filename
      });

      if (dlResponse.success) {
        showStatus(`✓ Download gestartet: "${response.filename}"!`, 'success');
      } else {
        throw new Error(dlResponse.error || 'Fehler beim Starten des Downloads.');
      }
    } catch (err) {
      console.error('Download execution failed:', err);
      showStatus(`Fehler: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  });

  // Listen for real-time status updates from service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'STATUS_UPDATE' && message.text) {
      showStatus(message.text, 'info');
    }
  });

  function setLoading(isLoading) {
    downloadBtn.disabled = isLoading;
    btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
    downloadBtn.querySelector('.btn-icon').style.display = isLoading ? 'none' : 'inline-block';
    if (isLoading) {
      btnText.textContent = 'Verarbeite...';
    } else {
      btnText.textContent = activeMode === 'audio' ? 'Audio herunterladen' : 'Video herunterladen';
    }
  }

  function showStatus(text, type = 'info') {
    statusBanner.className = `status-banner ${type}`;
    statusMessage.textContent = text;
    statusIcon.textContent = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ️');
    statusBanner.style.display = 'flex';
  }

  // --- 8. In-Page Sniffer Logic ---
  async function scanActivePageMedia() {
    if (!currentTabInfo || !currentTabInfo.id) return;
    
    snifferLoading.style.display = 'block';
    snifferList.innerHTML = '';
    snifferEmpty.style.display = 'none';

    try {
      const res = await chrome.tabs.sendMessage(currentTabInfo.id, { action: 'SCAN_PAGE_MEDIA' });
      snifferLoading.style.display = 'none';

      if (res && res.success && Array.isArray(res.media) && res.media.length > 0) {
        snifferCountBadge.textContent = res.media.length;
        snifferEmpty.style.display = 'none';

        res.media.forEach(item => {
          const card = document.createElement('div');
          card.className = 'media-item-card';

          const info = document.createElement('div');
          info.className = 'media-item-info';

          const title = document.createElement('div');
          title.className = 'media-item-title';
          title.textContent = item.title || 'Medien-Stream';

          const meta = document.createElement('div');
          meta.className = 'media-item-meta';
          const dimText = (item.width && item.height) ? `${item.width}x${item.height} • ` : '';
          const durText = item.duration ? `${item.duration}s • ` : '';
          meta.textContent = `${dimText}${durText}${item.type.toUpperCase()}`;

          info.appendChild(title);
          info.appendChild(meta);

          const dlBtn = document.createElement('button');
          dlBtn.className = 'media-download-btn';
          dlBtn.innerHTML = `
            <svg style="width:14px;height:14px;fill:currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span>Laden</span>
          `;

          dlBtn.addEventListener('click', async () => {
            dlBtn.disabled = true;
            dlBtn.querySelector('span').textContent = 'Lädt...';
            try {
              const filename = `OmniGrab_Stream_${Date.now()}.${item.type === 'audio' ? 'mp3' : 'mp4'}`;
              await chrome.runtime.sendMessage({
                action: 'START_DOWNLOAD',
                url: item.src,
                filename: filename,
                title: item.title
              });
              dlBtn.querySelector('span').textContent = 'Fertig!';
            } catch (e) {
              dlBtn.querySelector('span').textContent = 'Fehler';
            }
          });

          card.appendChild(info);
          card.appendChild(dlBtn);
          snifferList.appendChild(card);
        });
      } else {
        snifferCountBadge.textContent = '0';
        snifferEmpty.style.display = 'block';
      }
    } catch (err) {
      snifferLoading.style.display = 'none';
      snifferEmpty.style.display = 'block';
      snifferCountBadge.textContent = '0';
    }
  }

  rescanBtn.addEventListener('click', scanActivePageMedia);

  // --- 9. History Tab Logic ---
  async function loadHistory() {
    const res = await chrome.runtime.sendMessage({ action: 'GET_HISTORY' });
    historyList.innerHTML = '';

    if (res && res.success && Array.isArray(res.history) && res.history.length > 0) {
      historyEmpty.style.display = 'none';

      res.history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-item-card';

        const info = document.createElement('div');
        info.className = 'media-item-info';

        const title = document.createElement('div');
        title.className = 'media-item-title';
        title.textContent = item.filename || item.title || 'Download';

        const meta = document.createElement('div');
        meta.className = 'media-item-meta';
        const dateStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const statusStr = item.status === 'complete' ? '✓ Abgeschlossen' : (item.status === 'downloading' ? 'Lädt...' : item.status);
        meta.textContent = `${dateStr} • ${statusStr}`;

        info.appendChild(title);
        info.appendChild(meta);

        const openBtn = document.createElement('button');
        openBtn.className = 'media-download-btn';
        openBtn.textContent = 'Öffnen';
        openBtn.addEventListener('click', () => {
          chrome.downloads.show(item.id);
        });

        card.appendChild(info);
        card.appendChild(openBtn);
        historyList.appendChild(card);
      });
    } else {
      historyEmpty.style.display = 'block';
    }
  }

  clearHistoryBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'CLEAR_HISTORY' });
    loadHistory();
  });
});
