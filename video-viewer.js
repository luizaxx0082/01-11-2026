/* ==================================================================
   Visualizador imersivo de vídeo (9:16) + player customizado.
   API pública:  VideoViewer.open(item, elementoQueAbriu)  ·  VideoViewer.close()

   Decisões importantes:
   - UM único <video> compartilhado: nunca existem dois vídeos carregados ou
     tocando ao mesmo tempo, e o arquivo só é baixado quando alguém toca no card.
   - O viewer é anexado ao <body>, não à seção: o GSAP deixa `transform` inline
     nas seções, e isso quebraria qualquer position:fixed dentro delas.
   - Sem dependências: os ícones são SVG inline (mesmo traço do Lucide).
   ================================================================== */
(() => {
  'use strict';
  if (window.VideoViewer) return;

  const root = document.documentElement;
  const body = document.body;

  const svg = (inner, cls = '') =>
    `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
  const SPEAKER = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>';
  const ICON = {
    play: svg('<polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/>', 'i-play'),
    pause: svg('<rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>', 'i-pause'),
    replay: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', 'i-replay'),
    volOn: svg(`${SPEAKER}<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`, 'i-on'),
    volOff: svg(`${SPEAKER}<line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>`, 'i-off'),
    fs: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    retry: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>')
  };

  const fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const enterFs = (el) => Promise.resolve((el.requestFullscreen || el.webkitRequestFullscreen).call(el)).catch(() => {});
  const leaveFs = () => Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => {});

  const fmt = (s) => {
    s = Number.isFinite(s) && s > 0 ? s : 0;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  let viewer, player, video, ui;
  let isOpen = false, opener = null;
  let hideTimer = 0, loadTimer = 0, closeTimer = 0, lastMove = 0;
  let scrubbing = false, historyPushed = false, inerted = [];

  const setState = (name, on) => player.classList.toggle('is-' + name, !!on);

  /* ---------------------------------------------------------------- DOM */
  function build() {
    viewer = document.createElement('div');
    viewer.className = 'video-viewer';
    viewer.id = 'videoViewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Mensagem em vídeo');
    viewer.innerHTML = `
      <div class="vv-backdrop"></div>
      <button class="vv-close" type="button" aria-label="Fechar vídeo">${ICON.close}</button>
      <div class="vv-player">
        <video class="vv-video" playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noremoteplayback"></video>
        <div class="vv-meta"><strong></strong><span></span></div>
        <div class="vv-loading" aria-hidden="true"><i></i></div>
        <div class="vv-error" role="alert">
          <p>Não foi possível carregar este vídeo.</p>
          <button class="vv-retry" type="button">${ICON.retry}<span>tentar de novo</span></button>
        </div>
        <button class="vv-center" type="button" aria-label="Reproduzir">${ICON.play}${ICON.replay}</button>
        <div class="vv-controls">
          <div class="vv-progress" role="slider" tabindex="0" aria-label="Progresso do vídeo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00 de 0:00">
            <span class="vv-buffer"></span><span class="vv-fill"></span><span class="vv-thumb"></span>
          </div>
          <div class="vv-row">
            <button class="vv-btn vv-toggle" type="button" aria-label="Reproduzir">${ICON.play}${ICON.pause}</button>
            <span class="vv-time" aria-hidden="true">0:00 / 0:00</span>
            <span class="vv-spacer"></span>
            <button class="vv-btn vv-mute" type="button" aria-label="Silenciar vídeo">${ICON.volOn}${ICON.volOff}</button>
            <button class="vv-btn vv-fs" type="button" aria-label="Tela cheia">${ICON.fs}</button>
          </div>
        </div>
      </div>`;
    body.appendChild(viewer);

    const q = (s) => viewer.querySelector(s);
    player = q('.vv-player');
    video = q('.vv-video');
    ui = {
      close: q('.vv-close'), meta: q('.vv-meta'), metaName: q('.vv-meta strong'), metaRole: q('.vv-meta span'),
      center: q('.vv-center'), toggle: q('.vv-toggle'), mute: q('.vv-mute'), fs: q('.vv-fs'), retry: q('.vv-retry'),
      progress: q('.vv-progress'), fill: q('.vv-fill'), thumb: q('.vv-thumb'), buffer: q('.vv-buffer'), time: q('.vv-time')
    };
    ui.fs.hidden = !fsSupported; // iPhone não suporta fullscreen de elemento: o botão simplesmente não aparece

    bind();
  }

  function bind() {
    ui.close.addEventListener('click', () => close());
    viewer.addEventListener('click', (e) => {
      if (e.target === viewer || e.target.classList.contains('vv-backdrop')) close();
    });
    // trava o "scroll por trás" no iOS, onde overflow:hidden no body nem sempre basta
    viewer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    video.addEventListener('click', () => { toggle(); showUi(); });
    ui.center.addEventListener('click', toggle);
    ui.toggle.addEventListener('click', toggle);
    ui.mute.addEventListener('click', toggleMute);
    ui.fs.addEventListener('click', toggleFs);
    ui.retry.addEventListener('click', retry);

    player.addEventListener('pointermove', () => {
      const now = performance.now();
      if (now - lastMove > 250) { lastMove = now; showUi(); }
    });
    player.addEventListener('focusin', showUi);

    // barra de progresso (mouse, toque e teclado)
    const seekFromPointer = (e) => {
      const r = ui.progress.getBoundingClientRect();
      if (!r.width) return;
      seekTo(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (video.duration || 0));
    };
    ui.progress.addEventListener('pointerdown', (e) => {
      if (!Number.isFinite(video.duration)) return;
      scrubbing = true;
      ui.progress.setPointerCapture(e.pointerId);
      setState('scrubbing', true);
      seekFromPointer(e);
      showUi();
    });
    ui.progress.addEventListener('pointermove', (e) => { if (scrubbing) seekFromPointer(e); });
    const endScrub = () => { if (!scrubbing) return; scrubbing = false; setState('scrubbing', false); showUi(); };
    ui.progress.addEventListener('pointerup', endScrub);
    ui.progress.addEventListener('pointercancel', endScrub);
    ui.progress.addEventListener('keydown', (e) => {
      const d = video.duration;
      if (!Number.isFinite(d)) return;
      const t = video.currentTime;
      const map = { ArrowLeft: t - 5, ArrowDown: t - 5, ArrowRight: t + 5, ArrowUp: t + 5, PageDown: t - d * .1, PageUp: t + d * .1, Home: 0, End: d };
      if (!(e.key in map)) return;
      e.preventDefault();
      seekTo(map[e.key]);
      showUi();
    });

    // eventos do <video>
    const loadingOn = () => { clearTimeout(loadTimer); loadTimer = setTimeout(() => setState('loading', true), 250); };
    const loadingOff = () => { clearTimeout(loadTimer); setState('loading', false); };
    video.addEventListener('loadstart', loadingOn);
    video.addEventListener('waiting', loadingOn);
    video.addEventListener('seeking', loadingOn);
    ['canplay', 'playing', 'seeked', 'loadeddata'].forEach((n) => video.addEventListener(n, loadingOff));
    video.addEventListener('play', () => {
      setState('playing', true); setState('ended', false);
      if (!video.muted) pauseAmbient();
      syncLabels(); showUi();
    });
    video.addEventListener('pause', () => { setState('playing', false); syncLabels(); showUi(); });
    video.addEventListener('ended', () => { setState('playing', false); setState('ended', true); syncLabels(); showUi(); });
    video.addEventListener('timeupdate', paint);
    video.addEventListener('durationchange', paint);
    video.addEventListener('loadedmetadata', paint);
    video.addEventListener('progress', paintBuffer);
    video.addEventListener('volumechange', () => {
      setState('muted', video.muted);
      if (!video.muted && !video.paused) pauseAmbient();
      syncLabels();
    });
    video.addEventListener('error', () => {
      // ignora o "erro" que alguns navegadores disparam ao esvaziar o src no fechamento
      if (!isOpen || !video.getAttribute('src')) return;
      loadingOff(); setState('error', true); setState('playing', false); syncLabels();
    });

    const onFsChange = () => { setState('fs', !!fsElement()); syncLabels(); };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('visibilitychange', () => { if (isOpen && document.hidden) video.pause(); });
    window.addEventListener('popstate', () => { if (isOpen) { historyPushed = false; close(true); } });
  }

  /* ------------------------------------------------------------- Player */
  function startPlayback() {
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        // som bloqueado pela política do navegador → tenta mudo (o botão de som continua disponível)
        if (err && err.name === 'NotAllowedError') { video.muted = true; video.play().catch(() => {}); }
        // demais erros (ex.: arquivo ausente) chegam pelo evento 'error' do <video>
      });
    }
  }
  function toggle() { if (video.paused || video.ended) startPlayback(); else video.pause(); }
  function toggleMute() { video.muted = !video.muted; }
  function toggleFs() { if (fsElement()) leaveFs(); else enterFs(player); }
  function retry() {
    setState('error', false);
    video.load();
    startPlayback();
  }
  function seekTo(t) {
    const d = video.duration;
    if (!Number.isFinite(d)) return;
    video.currentTime = Math.max(0, Math.min(d, t));
    paint();
  }

  function paint() {
    const d = video.duration, t = video.currentTime;
    const ratio = Number.isFinite(d) && d > 0 ? Math.min(1, t / d) : 0;
    ui.fill.style.transform = `scaleX(${ratio})`;
    ui.thumb.style.left = `${ratio * 100}%`;
    ui.time.textContent = `${fmt(t)} / ${fmt(d)}`;
    ui.progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    ui.progress.setAttribute('aria-valuetext', `${fmt(t)} de ${fmt(d)}`);
  }
  function paintBuffer() {
    const d = video.duration, b = video.buffered;
    let end = 0;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= video.currentTime + .5) end = Math.max(end, b.end(i));
    ui.buffer.style.transform = `scaleX(${Number.isFinite(d) && d > 0 ? Math.min(1, end / d) : 0})`;
  }
  function syncLabels() {
    const ended = player.classList.contains('is-ended');
    const playing = player.classList.contains('is-playing');
    const label = ended ? 'Assistir novamente' : playing ? 'Pausar' : 'Reproduzir';
    ui.toggle.setAttribute('aria-label', label);
    ui.center.setAttribute('aria-label', label);
    ui.mute.setAttribute('aria-label', video.muted ? 'Ativar o som' : 'Silenciar vídeo');
    ui.fs.setAttribute('aria-label', fsElement() ? 'Sair da tela cheia' : 'Tela cheia');
  }

  // controles somem sozinhos durante a reprodução; qualquer interação os traz de volta
  function showUi() {
    setState('ui-hidden', false);
    clearTimeout(hideTimer);
    if (!isOpen || scrubbing || video.paused) return;
    hideTimer = setTimeout(() => setState('ui-hidden', true), 2600);
  }

  // o site já tem áudio ambiente: pausa quando o vídeo fala, para não sobrepor
  function pauseAmbient() {
    const a = document.getElementById('birthdayAudio');
    if (!a || a.paused) return;
    a.pause();
    a.dispatchEvent(new Event('ended')); // reaproveita o reset de UI do botão de som (script.js)
  }

  /* -------------------------------------------------- Abrir / fechar */
  function open(item, openerEl) {
    if (!item || !item.video) return;
    if (!viewer) build();
    if (isOpen) return;
    clearTimeout(closeTimer);
    isOpen = true;
    opener = openerEl || document.activeElement;

    const name = item.name || '', role = item.role || '';
    ui.metaName.textContent = name;
    ui.metaRole.textContent = role;
    ui.meta.hidden = !name && !role;
    viewer.setAttribute('aria-label', name ? `Mensagem em vídeo de ${name}` : 'Mensagem em vídeo');

    ['playing', 'ended', 'error', 'loading', 'ui-hidden', 'scrubbing'].forEach((s) => setState(s, false));
    lockScroll();
    makeOthersInert();
    try { history.pushState({ vvOpen: true }, ''); historyPushed = true; } catch (_) { historyPushed = false; }
    document.addEventListener('keydown', onKey);
    viewer.classList.add('is-open');

    // src + play() dentro do gesto do usuário (clique/toque), senão o iOS bloqueia
    video.poster = item.poster || '';
    video.muted = false;
    setState('muted', false);
    video.src = item.video;
    paint();
    syncLabels();
    startPlayback();
    requestAnimationFrame(() => { if (isOpen) ui.toggle.focus({ preventScroll: true }); });
  }

  function close(fromPopstate = false) {
    if (!isOpen) return;
    isOpen = false;
    clearTimeout(hideTimer); clearTimeout(loadTimer);
    if (fsElement()) leaveFs();
    video.pause();
    document.removeEventListener('keydown', onKey);
    viewer.classList.remove('is-open');
    unlockScroll();
    restoreInert();
    if (historyPushed) {
      historyPushed = false;
      if (!fromPopstate) { try { history.back(); } catch (_) { /* segue sem histórico */ } }
    }
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    opener = null;
    // espera a animação de saída e então libera a conexão/decodificador do vídeo
    closeTimer = setTimeout(() => {
      video.removeAttribute('src');
      video.removeAttribute('poster');
      video.load();
      paint();
    }, 650);
  }

  function lockScroll() {
    const gap = window.innerWidth - root.clientWidth; // largura da barra de rolagem (desktop)
    root.classList.add('vv-lock');
    if (gap > 0) body.style.paddingRight = `${gap}px`;
  }
  function unlockScroll() {
    root.classList.remove('vv-lock');
    body.style.paddingRight = '';
  }

  // `inert` tira o resto da página do foco e dos leitores de tela; o trap de Tab abaixo cobre navegadores antigos
  function makeOthersInert() {
    inerted = Array.from(body.children).filter((n) => n !== viewer && n.tagName !== 'SCRIPT' && !n.hasAttribute('inert'));
    inerted.forEach((n) => n.setAttribute('inert', ''));
  }
  function restoreInert() {
    inerted.forEach((n) => n.removeAttribute('inert'));
    inerted = [];
  }

  function onKey(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') { trapTab(e); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const t = e.target instanceof Element ? e.target : viewer;
    const onButton = !!t.closest('button');
    const onSlider = !!t.closest('.vv-progress');
    const key = e.key.toLowerCase();
    showUi();
    if (key === 'k' || (e.key === ' ' && !onButton)) { e.preventDefault(); toggle(); }
    else if (key === 'm') { toggleMute(); }
    else if (key === 'f' && fsSupported) { toggleFs(); }
    else if (e.key === 'ArrowLeft' && !onSlider) { e.preventDefault(); seekTo(video.currentTime - 5); }
    else if (e.key === 'ArrowRight' && !onSlider) { e.preventDefault(); seekTo(video.currentTime + 5); }
  }

  function trapTab(e) {
    const items = Array.from(viewer.querySelectorAll('button, [tabindex="0"]'))
      .filter((n) => !n.disabled && !n.hidden && getComputedStyle(n).visibility !== 'hidden');
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (!viewer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  window.VideoViewer = { open, close, get isOpen() { return isOpen; } };
})();
