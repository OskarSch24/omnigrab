/**
 * OmniGrab - Service Worker (Manifest V3)
 * Dual-Engine: Native High-Speed Engine (yt-dlp) + Web Streaming Fallback.
 */

const LOCAL_ENGINE_URL = 'http://127.0.0.1:58921';

// Initialize on extension install or update
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({
      settings: {
        defaultQuality: '1080',
        defaultAudioFormat: 'mp3',
        defaultMode: 'auto',
        customInstance: '',
        autoScanTabs: true,
        saveAsPrompt: false,
        theme: 'system'
      },
      history: []
    });
  }

  // Setup Context Menu
  try {
    chrome.contextMenus.create({
      id: 'omnigrab-download-link',
      title: 'Mit OmniGrab herunterladen',
      contexts: ['link', 'video', 'audio', 'page']
    });
  } catch (e) {
    console.warn('Context menu creation note:', e);
  }
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.linkUrl || info.srcUrl || info.pageUrl;
  if (!targetUrl) return;

  await flashBadge('⏳', '#0b57d0');

  try {
    const result = await resolveMediaDownload({
      url: targetUrl,
      videoQuality: '1080',
      downloadMode: 'auto'
    });

    if (result.success && result.downloadUrl) {
      await triggerDownload(result.downloadUrl, result.filename || 'omnigrab-media.mp4', result.title);
      await flashBadge('✓', '#34a853');
    } else {
      await flashBadge('✕', '#ea4335');
    }
  } catch (err) {
    console.error('Context menu download error:', err);
    await flashBadge('✕', '#ea4335');
  }
});

async function flashBadge(text, color) {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 3000);
  } catch (e) {}
}

function sanitizeFilename(name, defaultExt = 'mp4') {
  if (!name || typeof name !== 'string') {
    return `OmniGrab_Media_${Date.now()}.${defaultExt}`;
  }
  let clean = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();
  if (!clean || clean === '.') {
    clean = `OmniGrab_Media_${Date.now()}`;
  }
  if (!clean.includes('.')) {
    clean = `${clean}.${defaultExt}`;
  }
  return clean;
}

// 1. Check Native Local Engine (yt-dlp + ffmpeg)
async function checkLocalEngine() {
  try {
    const res = await fetch(`${LOCAL_ENGINE_URL}/health`, { method: 'GET' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Engine not running
  }
  return null;
}

// 2. Download via Native Local Engine (100% full duration, pristine audio)
async function resolveViaLocalEngine(options) {
  broadcastStatus('⚡ Bereite Download mit nativer High-Speed Engine vor...');

  const res = await fetch(`${LOCAL_ENGINE_URL}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    throw new Error(`Native Engine antwortete mit HTTP ${res.status}`);
  }

  const { task_id } = await res.json();
  if (!task_id) throw new Error('Keine Task-ID erhalten');

  // Poll progress from local engine
  while (true) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const pRes = await fetch(`${LOCAL_ENGINE_URL}/progress?id=${task_id}`);
      if (!pRes.ok) continue;
      const pData = await pRes.json();

      if (pData.text) {
        broadcastStatus(`⚡ ${pData.text}`);
      }

      if (pData.status === 'complete') {
        const cleanFilename = sanitizeFilename(pData.filename || 'Video.mp4');
        return {
          success: true,
          downloadUrl: pData.download_url,
          filename: cleanFilename,
          title: cleanFilename
        };
      }

      if (pData.status === 'error') {
        throw new Error(pData.error || 'Fehler beim nativen Download');
      }
    } catch (pollErr) {
      if (pollErr.message.includes('Fehler beim nativen Download')) throw pollErr;
    }
  }
}

// 3. Fallback: Cloud Web Streaming Engine
async function resolveViaStreamingEngine(options) {
  const { url, videoQuality = '1080', audioFormat = 'mp3', downloadMode = 'auto' } = options;

  let formatParam = '1080';
  let defaultExt = 'mp4';

  if (downloadMode === 'audio') {
    formatParam = (audioFormat || 'mp3').toLowerCase();
    defaultExt = formatParam;
  } else {
    if (videoQuality === 'max') formatParam = '1440';
    else if (['1080', '720', '480', '360'].includes(String(videoQuality))) {
      formatParam = String(videoQuality);
    } else {
      formatParam = '1080';
    }
    defaultExt = 'mp4';
  }

  broadcastStatus('Verbindung zum Cloud-Download-Server...');

  const query = new URLSearchParams({ format: formatParam, url: url });
  const initUrl = `https://loader.to/ajax/download.php?${query.toString()}`;
  const initRes = await fetch(initUrl, { headers: { 'Accept': 'application/json' } });

  if (!initRes.ok) {
    throw new Error(`Server antwortete mit HTTP-Status ${initRes.status}`);
  }

  const initData = await initRes.json();
  if (!initData.success || !initData.progress_url) {
    throw new Error(initData.text || initData.message || 'Stream konnte nicht vorbereitet werden.');
  }

  const title = initData.title || initData.info?.title || 'OmniGrab_Video';
  const progressUrl = initData.progress_url;
  const cleanFilename = sanitizeFilename(`${title}.${defaultExt}`, defaultExt);

  broadcastStatus('Konvertiere Mediendatei...');

  for (let attempt = 0; attempt < 35; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const pRes = await fetch(progressUrl, { headers: { 'Accept': 'application/json' } });
      if (!pRes.ok) continue;
      const pData = await pRes.json();

      if (pData.download_url) {
        return {
          success: true,
          downloadUrl: pData.download_url,
          filename: cleanFilename,
          title: title
        };
      }

      if (pData.text) {
        broadcastStatus(`Status: ${pData.text}...`);
      }
    } catch (pollErr) {}
  }

  throw new Error('Zeitüberschreitung bei der Cloud-Konvertierung.');
}

// Master Media Resolver
async function resolveMediaDownload(options) {
  // Try Native Local Engine first (unlimited duration, perfect audio, yt-dlp + ffmpeg)
  const localHealth = await checkLocalEngine();
  if (localHealth && localHealth.status === 'ok') {
    try {
      return await resolveViaLocalEngine(options);
    } catch (localErr) {
      console.warn('Native engine failed, falling back to cloud engine:', localErr);
    }
  }

  // Fallback to Cloud Streaming Engine
  try {
    return await resolveViaStreamingEngine(options);
  } catch (err) {
    console.error('All engines failed:', err);
    return {
      success: false,
      error: err.message || 'Download-Server nicht erreichbar.'
    };
  }
}

function broadcastStatus(text) {
  try {
    chrome.runtime.sendMessage({
      action: 'STATUS_UPDATE',
      text: text
    }).catch(() => {});
  } catch (e) {}
}

async function triggerDownload(url, filename, title = '') {
  const { settings } = await chrome.storage.local.get('settings');
  const saveAs = settings?.saveAsPrompt || false;
  const cleanFilename = sanitizeFilename(filename);

  const downloadId = await chrome.downloads.download({
    url: url,
    filename: cleanFilename,
    saveAs: saveAs
  });

  const { history = [] } = await chrome.storage.local.get('history');
  const newEntry = {
    id: downloadId,
    url: url,
    filename: cleanFilename,
    title: title || cleanFilename,
    timestamp: Date.now(),
    status: 'downloading'
  };

  const updatedHistory = [newEntry, ...history.slice(0, 49)];
  await chrome.storage.local.set({ history: updatedHistory });

  return downloadId;
}

chrome.downloads.onChanged.addListener(async (delta) => {
  if (!delta.state) return;
  const { history = [] } = await chrome.storage.local.get('history');
  const itemIndex = history.findIndex(h => h.id === delta.id);
  if (itemIndex !== -1) {
    history[itemIndex].status = delta.state.current;
    await chrome.storage.local.set({ history });
  }
});

// Runtime Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'CHECK_ENGINE') {
        const health = await checkLocalEngine();
        sendResponse({ success: true, health });
      } else if (message.action === 'RESOLVE_MEDIA') {
        const result = await resolveMediaDownload(message.options);
        sendResponse(result);
      } else if (message.action === 'START_DOWNLOAD') {
        const downloadId = await triggerDownload(message.url, message.filename, message.title);
        sendResponse({ success: true, downloadId });
      } else if (message.action === 'GET_HISTORY') {
        const { history = [] } = await chrome.storage.local.get('history');
        sendResponse({ success: true, history });
      } else if (message.action === 'CLEAR_HISTORY') {
        await chrome.storage.local.set({ history: [] });
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'Unknown action' });
      }
    } catch (err) {
      console.error('Service worker message handling error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});
