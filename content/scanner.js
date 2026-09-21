/**
 * OmniGrab Content Script - In-Page Media Scanner
 * Detects HTML5 video/audio elements, media sources, and OpenGraph/meta tags.
 */

(() => {
  // Prevent duplicate registration
  if (window.__omnigrab_scanner_installed) return;
  window.__omnigrab_scanner_installed = true;

  function scanMedia() {
    const results = [];
    const seenUrls = new Set();

    // 1. Scan HTML5 <video> elements
    const videos = document.querySelectorAll('video');
    videos.forEach((video, idx) => {
      let src = video.currentSrc || video.src;
      
      // If no direct src, check nested <source> tags
      if (!src) {
        const source = video.querySelector('source[src]');
        if (source) src = source.src;
      }

      if (src && !seenUrls.has(src) && !src.startsWith('blob:')) {
        seenUrls.add(src);
        results.push({
          id: `vid_${idx}`,
          type: 'video',
          src: src,
          title: video.title || document.title || 'Video Stream',
          poster: video.poster || null,
          duration: Math.round(video.duration) || null,
          width: video.videoWidth || null,
          height: video.videoHeight || null
        });
      }
    });

    // 2. Scan HTML5 <audio> elements
    const audios = document.querySelectorAll('audio');
    audios.forEach((audio, idx) => {
      let src = audio.currentSrc || audio.src;
      if (!src) {
        const source = audio.querySelector('source[src]');
        if (source) src = source.src;
      }
      if (src && !seenUrls.has(src) && !src.startsWith('blob:')) {
        seenUrls.add(src);
        results.push({
          id: `aud_${idx}`,
          type: 'audio',
          src: src,
          title: audio.title || document.title || 'Audio Stream',
          poster: null,
          duration: Math.round(audio.duration) || null
        });
      }
    });

    // 3. Scan OpenGraph & Twitter video meta tags
    const ogVideo = document.querySelector('meta[property="og:video"]')?.content ||
                    document.querySelector('meta[property="og:video:url"]')?.content ||
                    document.querySelector('meta[property="og:video:secure_url"]')?.content;
    if (ogVideo && !seenUrls.has(ogVideo)) {
      seenUrls.add(ogVideo);
      results.push({
        id: `og_vid`,
        type: 'video',
        src: ogVideo,
        title: document.querySelector('meta[property="og:title"]')?.content || document.title,
        poster: document.querySelector('meta[property="og:image"]')?.content || null,
        duration: null
      });
    }

    // 4. Extract page meta info
    const metaInfo = {
      title: document.title || '',
      url: window.location.href,
      ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || null
    };

    return { media: results, meta: metaInfo };
  }

  // Listen for queries from popup or service worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SCAN_PAGE_MEDIA') {
      try {
        const scanData = scanMedia();
        sendResponse({ success: true, ...scanData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // Keep message channel open for async response
  });
})();
