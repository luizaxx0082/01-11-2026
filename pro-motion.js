(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('premium-ready');
  if (reduced) return;

  const isTouch = matchMedia('(hover: none)').matches;
  const canGsap = !!(window.gsap && window.ScrollTrigger);
  const canMotion = !!window.Motion;
  const canAnime = !!window.anime;
  const safe = (label, fn) => { try { fn(); } catch (err) { console.warn(`[premium] ${label} desativado:`, err); } };

  if (canGsap) {
    gsap.registerPlugin(ScrollTrigger);
    // No Chrome mobile, a barra de endereço recolhe/aparece durante o scroll e muda a altura
    // da viewport; sem isto, o ScrollTrigger pode recalcular a posição errada do gatilho e
    // deixar o conteúdo preso em opacity:0 para sempre.
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  // ---------- Cursor líquido: segue o ponteiro e se estica com a velocidade ----------
  safe('cursor', () => {
    if (isTouch) return;
    const cursor = document.createElement('div');
    cursor.className = 'cursor-orb';
    const glow = document.createElement('div');
    glow.className = 'pro-glow';
    document.body.append(cursor, glow);
    let targetX = innerWidth / 2, targetY = innerHeight / 2, x = targetX, y = targetY, prevX = x, prevY = y, frame = 0;
    const move = event => { targetX = event.clientX; targetY = event.clientY; glow.style.setProperty('--mx', `${targetX}px`); glow.style.setProperty('--my', `${targetY}px`); };
    addEventListener('pointermove', move, { passive: true });
    const cursorLoop = () => {
      x += (targetX - x) * .18; y += (targetY - y) * .18;
      const vx = x - prevX, vy = y - prevY;
      const speed = Math.min(Math.hypot(vx, vy), 36);
      const angle = Math.atan2(vy, vx) * 180 / Math.PI;
      cursor.style.left = `${x}px`; cursor.style.top = `${y}px`;
      cursor.style.transform = `translate(-50%,-50%) rotate(${angle}deg) scaleX(${1 + speed * .015}) scaleY(${1 - speed * .008})`;
      prevX = x; prevY = y;
      frame = requestAnimationFrame(cursorLoop);
    };
    cursorLoop();
    document.querySelectorAll('a,button,.cards article,.marquee figure').forEach(el => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
    });
    addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
  });

  // ---------- Barra de progresso de leitura, amarrada ao scroll via Motion ----------
  safe('barra de progresso', () => {
    const progress = document.getElementById('scrollProgress');
    if (!progress) return;
    if (canMotion) {
      Motion.scroll(Motion.animate(progress, { scaleX: [0, 1] }, { easing: 'linear' }));
    } else {
      addEventListener('scroll', () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      }, { passive: true });
    }
  });

  // ---------- Entrada do hero como uma única sequência orquestrada ----------
  safe('entrada do hero', () => {
    if (!canGsap) return;
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .fromTo('.hero .eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6 })
      .fromTo('.hero h1', { clipPath: 'inset(0 0 100% 0)', y: 26 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1, ease: 'expo.out' }, '-=.35')
      .fromTo('.hero .lead', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .7 }, '-=.6')
      .fromTo('.hero-actions > *', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .55, stagger: .08 }, '-=.45')
      .fromTo('.hero-visual > *', { opacity: 0, y: 24, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .9, stagger: .08 }, '-=.7');
  });

  // ---------- Revelação das seções ao entrar na tela ----------
  safe('revelação das seções', () => {
    if (!canGsap) return;
    // IntersectionObserver detecta "entrou na tela" de forma nativa e contínua — ao contrário de
    // um gatilho calculado em pixels, não se perde com scroll rápido/fling nem com a página
    // mudando de altura (imagens carregando, fontes, etc).
    const canIO = 'IntersectionObserver' in window;
    const revealOnce = (targets, { y = 20, duration = .7, stagger = 0 } = {}, rootMargin = '0px 0px -10% 0px') => {
      if (!canIO) return;
      const els = gsap.utils.toArray(targets);
      if (!els.length) return;
      gsap.set(els, { y, opacity: 0 });
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const i = els.indexOf(entry.target);
          gsap.to(entry.target, { y: 0, opacity: 1, duration, ease: 'power3.out', delay: stagger ? i * stagger : 0, overwrite: 'auto' });
          io.unobserve(entry.target);
        });
      }, { rootMargin, threshold: .01 });
      els.forEach(el => io.observe(el));
    };
    revealOnce('main > section:not(.hero), footer', { y: 24, duration: .7 });
    revealOnce('.cards article', { y: 18, duration: .5, stagger: .08 }, '0px 0px -14% 0px');
    revealOnce('.messages-grid .message-card', { y: 18, duration: .5, stagger: .08 }, '0px 0px -12% 0px');
    gsap.fromTo('.quote-band p', { opacity: .4, scale: .98 }, { opacity: 1, scale: 1, ease: 'none', scrollTrigger: { trigger: '.quote-band', start: 'top 78%', end: 'top 40%', scrub: .6 } });
  });

  // ---------- Foto: paralaxe no scroll + inclinação 3D ao passar o mouse ----------
  safe('foto em 3D', () => {
    if (!canGsap) return;
    gsap.to('.photo-frame', { y: -10, rotation: 2.5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8 } });
    gsap.to('.orbit-one', { rotation: 12, scale: 1.05, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 } });
    if (isTouch) return;
    const frame = document.querySelector('.photo-frame');
    if (!frame) return;
    gsap.set(frame, { transformPerspective: 800, transformStyle: 'preserve-3d' });
    const rotX = gsap.quickTo(frame, 'rotationX', { duration: .6, ease: 'power3.out' });
    const rotY = gsap.quickTo(frame, 'rotationY', { duration: .6, ease: 'power3.out' });
    frame.addEventListener('pointermove', e => {
      const r = frame.getBoundingClientRect();
      rotY(((e.clientX - r.left) / r.width - .5) * 14);
      rotX(((e.clientY - r.top) / r.height - .5) * -14);
    });
    frame.addEventListener('pointerleave', () => { rotX(0); rotY(0); });
  });

  // ---------- Cards, magic-card e finale-cards: brilho que segue o cursor ----------
  safe('spotlight dos cards', () => {
    if (isTouch) return;
    document.querySelectorAll('.cards article, .finale-cards article, .magic-card, .message-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        card.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      });
    });
  });

  // ---------- Marquee: velocidade reage à direção e força do scroll ----------
  safe('marquee reativo', () => {
    if (!canGsap) return;
    const track = document.querySelector('.marquee-track');
    const wrap = document.querySelector('.marquee');
    if (!track || !wrap) return;
    track.classList.add('js-driven');
    const marqueeTween = gsap.to(track, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 });

    // Velocidade automática reage à direção/força do scroll da página
    let lastY = scrollY, frame = 0;
    const velocityLoop = () => {
      const velocity = scrollY - lastY;
      lastY = scrollY;
      const target = Math.abs(velocity) > 1.5 ? gsap.utils.clamp(-3, 3, velocity / 22) : 1;
      const current = marqueeTween.timeScale();
      marqueeTween.timeScale(current + (target - current) * .12);
      frame = requestAnimationFrame(velocityLoop);
    };
    velocityLoop();

    // Arrasto manual (mouse e toque): pausa o auto-scroll enquanto arrasta, retoma de onde parou ao soltar
    let isDragging = false, startX = 0, startPercent = 0, pointerId = null;
    wrap.addEventListener('pointerenter', () => { if (!isDragging) marqueeTween.pause(); });
    wrap.addEventListener('pointerleave', () => { if (!isDragging) marqueeTween.resume(); });
    wrap.addEventListener('pointerdown', e => {
      isDragging = true;
      pointerId = e.pointerId;
      wrap.setPointerCapture(pointerId);
      wrap.classList.add('is-dragging');
      startX = e.clientX;
      startPercent = gsap.getProperty(track, 'xPercent');
      marqueeTween.pause();
    });
    wrap.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const deltaPercent = (e.clientX - startX) / track.offsetWidth * 100;
      gsap.set(track, { xPercent: gsap.utils.wrap(-50, 0, startPercent + deltaPercent) });
    });
    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      wrap.classList.remove('is-dragging');
      if (pointerId !== null) { try { wrap.releasePointerCapture(pointerId); } catch (err) { /* ponteiro já liberado */ } }
      const progress = gsap.utils.clamp(0, 1, gsap.getProperty(track, 'xPercent') / -50);
      marqueeTween.progress(progress).play();
    };
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointercancel', endDrag);

    addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
  });

  // ---------- Motion: magnetismo com física de mola em elementos secundários ----------
  safe('magnetismo (Motion)', () => {
    if (!canMotion || isTouch) return;
    document.querySelectorAll('.quiet, .sound, .text-link, .topbar nav a').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        Motion.animate(el, {
          x: (e.clientX - r.left - r.width / 2) * .25,
          y: (e.clientY - r.top - r.height / 2) * .4
        }, { type: 'spring', stiffness: 300, damping: 18 });
      });
      el.addEventListener('pointerleave', () => {
        Motion.animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 250, damping: 16 });
      });
    });
    document.querySelectorAll('.button.primary, .finale-exit').forEach(button => {
      button.addEventListener('pointermove', event => { const r = button.getBoundingClientRect(); window.gsap?.to(button, { x: (event.clientX - r.left - r.width / 2) * .08, y: (event.clientY - r.top - r.height / 2) * .1, duration: .18, ease: 'power2.out', overwrite: true }); });
      button.addEventListener('pointerleave', () => window.gsap?.to(button, { x: 0, y: 0, duration: .3, ease: 'power2.out', overwrite: true }));
    });
  });

  // ---------- Motion: feedback tátil de pressão em todos os botões ----------
  safe('feedback de toque (Motion)', () => {
    if (!canMotion) return;
    Motion.press('.button, .quiet, .sound, .text-link, .finale-exit, .finale-close, .finale-spark, .magic-button', (el) => {
      Motion.animate(el, { scale: .94 }, { type: 'spring', stiffness: 500, damping: 20 });
      return () => Motion.animate(el, { scale: 1 }, { type: 'spring', stiffness: 380, damping: 14 });
    });
  });

  // ---------- Barra do topo: leve reforço de fundo ao rolar (mantém o comportamento original) ----------
  safe('barra do topo', () => {
    addEventListener('scroll', () => document.querySelector('.topbar')?.classList.toggle('scrolled', scrollY > 40), { passive: true });
  });

  // ---------- anime.js: pequenas respirações ambientes (a entrada da tela final vive em finale-scene.js) ----------
  safe('anime.js', () => {
    if (!canAnime) return;
    anime({ targets: '.magic-symbol,.sparkles', rotate: [-3, 3], scale: [.97, 1.03], direction: 'alternate', loop: true, easing: 'easeInOutSine', duration: 2600 });
  });

  // ---------- Three.js: partículas ambiente com paralaxe de mouse e scroll ----------
  safe('partículas 3D', () => {
    if (!window.THREE) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'ambient-canvas';
    document.body.prepend(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1 : 1.15));
    renderer.setSize(innerWidth, innerHeight, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 100);
    camera.position.z = 8;

    // sprite circular suave, para partículas macias em vez de pontos quadrados
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);

    const count = isTouch ? 40 : 76;
    const positions = [];
    for (let i = 0; i < count; i++) positions.push((Math.random() - .5) * 14, (Math.random() - .5) * 8, (Math.random() - .5) * 5);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ map: sprite, color: 0xcf9a92, size: .05, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(points);

    let mouseX = 0, mouseY = 0;
    if (!isTouch) addEventListener('pointermove', e => { mouseX = e.clientX / innerWidth - .5; mouseY = e.clientY / innerHeight - .5; }, { passive: true });

    let scrollProgress = 0;
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      scrollProgress = max > 0 ? scrollY / max : 0;
    }, { passive: true });

    let active = true, frame = 0, last = 0;
    const render = time => {
      frame = requestAnimationFrame(render);
      if (!active || time - last < 50) return;
      last = time;
      points.rotation.y += .00045;
      points.rotation.x = Math.sin(time * .00012) * .025 + scrollProgress * .18;
      camera.position.x += (mouseX * 1.1 - camera.position.x) * .04;
      camera.position.y += (-mouseY * .8 - camera.position.y) * .04;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };
    render(0);
    document.addEventListener('visibilitychange', () => { active = !document.hidden; if (active) renderer.render(scene, camera); });
    addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); }, { passive: true });
    addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
  });

  // ---------- Rede de segurança: garante que nada fique preso invisível ----------
  safe('recalibração dos gatilhos de scroll', () => {
    if (!canGsap) return;
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(refresh);
    addEventListener('load', refresh);
    // se, por qualquer motivo, algum elemento ainda estiver invisível bem depois da carga
    // (ex.: um gatilho que nunca chegou a ser cruzado), revela tudo à força — nunca some conteúdo.
    setTimeout(() => {
      refresh();
      document.querySelectorAll('main > section, footer, .cards article, .message-card').forEach(el => {
        if (getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().top < innerHeight * 1.4) {
          gsap.to(el, { opacity: 1, y: 0, duration: .5, overwrite: 'auto' });
        }
      });
    }, 1200);
  });
})();
