/**
 * Pagetrix v4.3 - Network Priority & High-Speed Progress
 */
const pagetrix = (() => {
  if (window.__PAGETRIX_ACTIVE__ && !window.__PAGETRIX_SWAPPING__) return window.pagetrix;

  window.__PAGETRIX_EXECUTED__ = window.__PAGETRIX_EXECUTED__ || new Set();

  const state = {
    cache: new Map(),
    preloadQueue: new Set(),
    controller: new AbortController(),
    isListening: false,
    isSlow: false,
    progressBar: null,
    progressTimer: null,
    currentPercent: 0
  };

  const createProgressBar = () => {
    let bar = document.getElementById('pagetrix-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pagetrix-progress';
      Object.assign(bar.style, {
        position: 'fixed', top: '0', left: '0', height: '3px',
        backgroundColor: '#007bff', zIndex: '2147483647',
        transition: 'width 0.1s linear, opacity 0.3s ease',
        width: '0%', opacity: '0', pointerEvents: 'none',
        boxShadow: '0 0 8px rgba(0,123,255,0.6)'
      });
      document.documentElement.appendChild(bar);
    }
    state.progressBar = bar;
  };

  const updateProgress = (val) => {
    if (!state.progressBar) createProgressBar();
    state.currentPercent = val;
    state.progressBar.style.opacity = val > 0 ? '1' : '0';
    state.progressBar.style.width = `${val}%`;
    if (val >= 100) {
      state.progressBar.style.transition = 'width 0.2s ease, opacity 0.4s ease';
      setTimeout(() => {
        if (state.progressBar) {
          state.progressBar.style.opacity = '0';
          setTimeout(() => { 
            state.progressBar.style.width = '0%'; 
            state.currentPercent = 0;
            state.progressBar.style.transition = 'width 0.1s linear, opacity 0.3s ease';
          }, 400);
        }
      }, 200);
    }
  };

  const startGlide = () => {
    clearInterval(state.progressTimer);
    updateProgress(5);
    state.progressTimer = setInterval(() => {
      if (state.currentPercent < 98) {
        updateProgress(state.currentPercent + 0.5);
      } else {
        clearInterval(state.progressTimer);
      }
    }, 100);
  };

  const resolveURL = (rawHref) => {
    try {
      const currentUrl = new URL(window.location.href);
      if (rawHref === '..') {
        let pathParts = currentUrl.pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length > 0) pathParts.pop();
        const newPath = '/' + pathParts.join('/') + (pathParts.length > 0 ? '/' : '');
        return new URL(newPath, currentUrl.origin);
      }
      const url = new URL(rawHref, window.location.href);
      if (!url.pathname.endsWith('/') && !url.pathname.split('/').pop().includes('.')) {
        url.pathname += '/';
      }
      return url;
    } catch (e) { return null; }
  };

  const goto = async (rawUrl) => {
    const url = resolveURL(rawUrl);
    if (!url || url.origin !== window.location.origin) {
      if (url) window.location.href = url.href;
      return;
    }

    // Immediately kill any active background fetches
    state.controller.abort();
    state.controller = new AbortController();
    state.preloadQueue.delete(url.href);

    const cachedHtml = state.cache.get(url.href);
    if (cachedHtml) {
      updateProgress(100);
      performSwap(cachedHtml, url.href);
      return;
    }

    startGlide();

    try {
      // HIGH PRIORITY FETCH: Takes precedence over images/media
      const response = await fetch(url.href, { 
        signal: state.controller.signal,
        priority: 'high',
        importance: 'high' // Legacy support for older Chromium
      });
      
      if (!response.ok) {
        console.log('BROKEN!')
        throw new Error();
        return;
      }
      
      const html = await response.text();
      state.cache.set(url.href, html);
      
      clearInterval(state.progressTimer);
      updateProgress(100);
      
      setTimeout(() => performSwap(html, url.href), 50);
    } catch (e) {
      if (e.name !== 'AbortError') {
        clearInterval(state.progressTimer);
        updateProgress(0);
        window.location.href = url.href;
      }
    }
  };

  const performSwap = (html, url) => {
    if (window.__PAGETRIX_SWAPPING__) return;
    window.__PAGETRIX_SWAPPING__ = true;

    const persistentNodes = Array.from(document.querySelectorAll('.pagetrix-persist')).filter(n => n.id);
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    const newTitle = newDoc.querySelector('title')?.innerText;

    window.history.pushState(null, '', url);
    if (newTitle) document.title = newTitle;
    
    document.documentElement.innerHTML = html;
    createProgressBar();

    persistentNodes.forEach(oldNode => {
      const newNodePlaceholder = document.getElementById(oldNode.id);
      if (newNodePlaceholder) newNodePlaceholder.replaceWith(oldNode);
    });

    executeScripts(document.documentElement);
    window.scrollTo(0, 0);
    
    window.__PAGETRIX_SWAPPING__ = false;
    state.preloadQueue.clear(); 
    if (!state.isSlow) preloadParent();
  };

  const executeScripts = (container) => {
    const scripts = Array.from(container.querySelectorAll('script'));
    scripts.forEach(oldScript => {
      if (oldScript.closest('.pagetrix-persist')) return;
      const scriptId = oldScript.src || oldScript.innerHTML.trim();
      if (oldScript.hasAttribute('data-pagetrix-once') && window.__PAGETRIX_EXECUTED__.has(scriptId)) return;
      
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      if (scriptId) window.__PAGETRIX_EXECUTED__.add(scriptId);
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  };

  const init = () => {
    window.__PAGETRIX_ACTIVE__ = true;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) state.isSlow = conn.saveData || /(2g|3g)/.test(conn.effectiveType);

    document.querySelectorAll('script').forEach(s => {
      const id = s.src || s.innerHTML.trim();
      if (id) window.__PAGETRIX_EXECUTED__.add(id);
    });

    if (!state.cache.has(window.location.href)) {
      state.cache.set(window.location.href, document.documentElement.innerHTML);
    }

    if (!state.isListening) {
      attachPersistentListeners();
      window.addEventListener('popstate', handlePopState);
      state.isListening = true;
    }
    if (!state.isSlow) preloadParent();
  };

  const fetchPage = async (rawHref) => {
    if (state.isSlow) return;
    const url = resolveURL(rawHref);
    if (!url || url.origin !== window.location.origin) return;
    if (state.cache.has(url.href) || state.preloadQueue.has(url.href)) return;
    
    state.preloadQueue.add(url.href);
    try {
      // PRELOADS use 'low' priority so they don't lag out current media
      const response = await fetch(url.href, { 
        signal: state.controller.signal,
        priority: 'low' 
      });
      if (response.ok) {
        state.cache.set(url.href, await response.text());
      }
    } catch (e) {
      state.preloadQueue.delete(url.href);
    }
  };

  const attachPersistentListeners = () => {
    if (!state.isSlow) {
      document.addEventListener('mouseover', e => {
        const href = e.target.closest('a:not([download])')?.getAttribute('href');
        if (href) fetchPage(href);
      }, { passive: true });
    }
    document.addEventListener('click', e => {
      const link = e.target.closest('a:not([download])');
      if (!link?.href || link.target === '_blank' || e.metaKey || e.ctrlKey) return;
      const url = resolveURL(link.getAttribute('href'));
      if (url && url.origin === window.location.origin) {
        e.preventDefault();
        goto(url.href);
      }
    }, true);
  };

  const handlePopState = () => {
    const html = state.cache.get(window.location.href);
    if (html) performSwap(html, window.location.href);
    else window.location.reload();
  };

  const preloadParent = () => {
    if (state.isSlow) return;
    const url = resolveURL('..');
    if (url) fetchPage(url.href);
  };

  return { init, goto };
})();

window.pagetrix = pagetrix;
pagetrix.init();