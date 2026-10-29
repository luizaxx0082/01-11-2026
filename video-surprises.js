/* ==================================================================
   Seção "Uma surpresa" — renderiza os cards a partir de window.VIDEO_MESSAGES
   (veja video-messages.js). O cabeçalho é HTML estático no index.html (sem
   layout shift); aqui só nasce o que depende dos dados.

   No card existe apenas o poster: nenhum <video> é carregado até o toque.
   ================================================================== */
(() => {
  'use strict';
  const section = document.getElementById('video-surprises');
  const stage = document.getElementById('vsStage');
  if (!section || !stage) return;

  const items = (Array.isArray(window.VIDEO_MESSAGES) ? window.VIDEO_MESSAGES : [])
    .filter((v) => v && typeof v.video === 'string' && v.video.trim());

  // sem vídeos → a seção some por completo, sem deixar buraco na página
  if (!items.length) { section.hidden = true; return; }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const many = items.length > 1;

  const PLAY = '<svg class="ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 1c.6 5.6 5.4 10.4 11 11-5.6.6-10.4 5.4-11 11-.6-5.6-5.4-10.4-11-11C6.6 11.4 11.4 6.6 12 1z"/></svg>';

  // data-count deixa o CSS escolher a composição: 1 · 2 · 3 · many
  stage.dataset.count = items.length <= 3 ? String(items.length) : 'many';

  stage.innerHTML = items.map((v, i) => {
    const name = v.name ? esc(v.name) : '';
    const role = v.role ? esc(v.role) : '';
    const label = v.name ? `Assistir à mensagem de ${v.name}` : 'Assistir à mensagem em vídeo';
    const poster = v.poster ? `<img src="${esc(v.poster)}" alt="" width="720" height="1280" loading="lazy" decoding="async">` : '';
    const meta = name || role
      ? `<div class="vs-meta">${name ? `<strong>${name}</strong>` : ''}${role ? `<span>${role}</span>` : ''}</div>`
      : '';
    return `
      <article class="vs-card${v.poster ? '' : ' is-fallback'}">
        <div class="vs-frame">
          <button class="vs-open" type="button" data-index="${i}" aria-label="${esc(label)}" aria-haspopup="dialog">
            <span class="vs-poster">${poster}<span class="vs-mark" aria-hidden="true">${STAR}</span></span>
            <span class="vs-shade" aria-hidden="true"></span>
            ${many ? `<span class="vs-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>` : ''}
            <span class="vs-play" aria-hidden="true">${PLAY}</span>
            <span class="vs-hint" aria-hidden="true">assistir mensagem</span>
          </button>
        </div>
        ${meta}
      </article>`;
  }).join('');

  // subtítulo no plural quando houver mais de um vídeo
  const sub = section.querySelector('[data-vs-sub]');
  if (sub && many && sub.dataset.plural) sub.textContent = sub.dataset.plural;

  // poster ausente/quebrado → cai no fundo ameixa com a estrela (nada quebra)
  stage.querySelectorAll('.vs-poster img').forEach((img) => {
    const fail = () => img.closest('.vs-card').classList.add('is-fallback');
    img.addEventListener('error', fail, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
  });

  // um único listener para todos os cards (escala para qualquer quantidade)
  stage.addEventListener('click', (e) => {
    const btn = e.target.closest('.vs-open');
    if (!btn || !window.VideoViewer) return;
    window.VideoViewer.open(items[Number(btn.dataset.index)], btn);
  });

  // entrada no scroll: cabeçalho e vídeo observados separadamente, disparam uma vez só
  const reveal = (el) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { el.classList.add('is-in'); io.disconnect(); }
    }, { threshold: .2, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
  };
  reveal(section.querySelector('.vs-head'));
  reveal(section.querySelector('.vs-stage-wrap'));
})();
