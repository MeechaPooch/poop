/**
 * Pagetrix v5.3 - Multi-Image Instance Fix & Priority Fetching
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
    glideTimeout: null,
    currentPercent: 0
  };

  const clearCache = () =>{
    state.cache = new Map();
  }

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
    clearTimeout(state.glideTimeout);
    state.glideTimeout = setTimeout(() => {
      updateProgress(5);
      state.progressTimer = setInterval(() => {
        if (state.currentPercent < 98) {
          updateProgress(state.currentPercent + 0.5);
        } else {
          clearInterval(state.progressTimer);
        }
      }, 100);
    }, 500);
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

  const goto = async (rawUrl, bypassCache = false, keepScroll = false) => {
    const url = resolveURL(rawUrl);
    if (!url || url.origin !== window.location.origin) {
      if (url) window.location.href = url.href;
      return;
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    state.controller.abort();
    state.controller = new AbortController();
    state.preloadQueue.delete(url.href);

    const cachedHtml = state.cache.get(url.href);
    if (cachedHtml && !bypassCache) {
      performSwap(cachedHtml, url.href, keepScroll ? { x: scrollX, y: scrollY } : null);
      return;
    }

    startGlide();

    try {
      const response = await fetch(url.href, { 
        signal: state.controller.signal,
        priority: 'high',
        importance: 'high',
        cache: bypassCache ? 'no-cache' : 'default'
      });
      
      if (!response.ok) throw new Error();
      
      const html = await response.text();
      state.cache.set(url.href, html);
      
      clearTimeout(state.glideTimeout);
      clearInterval(state.progressTimer);
      updateProgress(100);
      
      setTimeout(() => performSwap(html, url.href, keepScroll ? { x: scrollX, y: scrollY } : null), 50);
    } catch (e) {
      if (e.name !== 'AbortError') {
        clearTimeout(state.glideTimeout);
        clearInterval(state.progressTimer);
        updateProgress(0);
        window.location.href = url.href;
      }
    }
  };

  const reload = () => goto(window.location.href, true, true);

  const performSwap = (html, url, scrollPos = null) => {
    if (window.__PAGETRIX_SWAPPING__) return;
    window.__PAGETRIX_SWAPPING__ = true;

    const persistentNodes = Array.from(document.querySelectorAll('.pagetrix-persist')).filter(n => n.id);
    const oldImages = Array.from(document.images);
    const usedImages = new Set(); 

    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    const newTitle = newDoc.querySelector('title')?.innerText;

    window.history.pushState(null, '', url);
    if (newTitle) document.title = newTitle;
    
    newDoc.querySelectorAll('img').forEach(newImg => {
      const match = oldImages.find(oldImg => oldImg.src === newImg.src && !usedImages.has(oldImg));
      if (match) {
        usedImages.add(match);
        if (match.complete) {
            newImg.replaceWith(match);
        } else {
            newImg.src = match.src;
        }
      }
    });

    document.body.replaceWith(newDoc.body);
    createProgressBar();

    persistentNodes.forEach(oldNode => {
      const newNodePlaceholder = document.getElementById(oldNode.id);
      if (newNodePlaceholder) newNodePlaceholder.replaceWith(oldNode);
    });

    executeScripts(document.body); 

    if (scrollPos) {
      window.scrollTo(scrollPos.x, scrollPos.y);
    } else {
      window.scrollTo(0, 0);
    }
    
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
      const response = await fetch(url.href, { signal: state.controller.signal, priority: 'low' });
      if (response.ok) state.cache.set(url.href, await response.text());
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
      
      const targetUrl = resolveURL(link.getAttribute('href'));
      if (targetUrl && targetUrl.origin === window.location.origin) {
        e.preventDefault();
        
        // ADJACENCY CHECK
        const currentPathParts = window.location.pathname.split('/').filter(Boolean);
        const targetPathParts = targetUrl.pathname.split('/').filter(Boolean);
        
        // Remove the last segment of each to get the "parent" path
        const currentParent = currentPathParts.slice(0, -1).join('/');
        const targetParent = targetPathParts.slice(0, -1).join('/');
        
        const isAdjacent = currentParent === targetParent && currentPathParts.length === targetPathParts.length;
        
        goto(targetUrl.href, false, true);
        // goto(targetUrl.href, false, isAdjacent);
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

  return { init, goto, reload, clearCache };
})();

window.pagetrix = pagetrix;
pagetrix.init();