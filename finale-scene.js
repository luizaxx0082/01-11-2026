(() => {
  'use strict';
  const finale = document.getElementById('finaleScreen');
  if (!finale) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  const canGsap = !!window.gsap;
  const canAnime = !!window.anime;
  const canMotion = !!window.Motion;
  const canThree = !!window.THREE;
  const safe = (label, fn) => { try { return fn(); } catch (err) { console.warn(`[finale] ${label} desativado:`, err); } };

  const title = document.getElementById('finaleTitle');
  const canvas = document.getElementById('finaleCanvas');
  const flash = document.getElementById('finaleFlash');
  const sparkBtn = document.getElementById('finaleSpark');
  const cards = finale.querySelectorAll('.finale-cards article');

  // ---------- Anime.js: quebra o título em letras soltas, prontas para animar em cascata ----------
  safe('preparar título em letras', () => {
    if (title.dataset.lettersSplit === 'done') return;
    title.dataset.lettersSplit = 'done';
    title.querySelectorAll('[data-split]').forEach(node => {
      const text = node.textContent;
      node.textContent = '';
      text.split('').forEach(char => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = char === ' ' ? '\u00A0' : char;
        node.appendChild(span);
      });
    });
  });

  // ---------- Three.js: campo de partículas douradas + anel-portal, que "explode" ao abrir ----------
  const scene3d = safe('cena 3D', () => {
    if (!canThree || reduced) return null;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1 : 1.4));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
    camera.position.z = 9;

    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);

    const count = isTouch ? 90 : 170;
    const palette = [0xd7ad72, 0xd99aa3, 0xf5eee5, 0xc98f91];
    const start = new Float32Array(count * 3);
    const end = new Float32Array(count * 3);
    const current = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tmpColor = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // ponto de origem: um núcleo pequeno no centro do portal
      start[i3] = (Math.random() - .5) * .6;
      start[i3 + 1] = (Math.random() - .5) * .6;
      start[i3 + 2] = (Math.random() - .5) * .6;
      // destino: espalhados numa esfera irregular, como uma constelação
      const radius = 3.2 + Math.random() * 3.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      end[i3] = radius * Math.sin(phi) * Math.cos(theta);
      end[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * .62;
      end[i3 + 2] = radius * Math.cos(phi) * .5;
      current[i3] = start[i3]; current[i3 + 1] = start[i3 + 1]; current[i3 + 2] = start[i3 + 2];
      tmpColor.set(palette[i % palette.length]);
      colors[i3] = tmpColor.r; colors[i3 + 1] = tmpColor.g; colors[i3 + 2] = tmpColor.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(current, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ map: sprite, size: .16, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(points);

    // anel em wireframe girando lentamente atrás do texto — o coração visual do "portal"
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, .012, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xd7ad72, transparent: true, opacity: 0 })
    );
    ring.rotation.x = Math.PI / 2.35;
    scene.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, .008, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xd99aa3, transparent: true, opacity: 0 })
    );
    ring2.rotation.x = Math.PI / 2.1;
    scene.add(ring2);

    let mouseX = 0, mouseY = 0;
    if (!isTouch) finale.addEventListener('pointermove', e => {
      const r = finale.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width - .5;
      mouseY = (e.clientY - r.top) / r.height - .5;
    }, { passive: true });

    let burstStart = 0, bursting = false;
    const burst = () => {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        current[i3] = (Math.random() - .5) * .6;
        current[i3 + 1] = (Math.random() - .5) * .6;
        current[i3 + 2] = (Math.random() - .5) * .6;
      }
      burstStart = performance.now();
      bursting = true;
    };

    const resize = () => {
      const w = finale.clientWidth || innerWidth, h = finale.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    addEventListener('resize', resize, { passive: true });

    let active = false, frame = 0;
    const render = time => {
      frame = requestAnimationFrame(render);
      if (!active) return;
      const posAttr = geometry.attributes.position;
      if (bursting) {
        const t = Math.min(1, (time - burstStart) / 2200);
        const ease = 1 - Math.pow(1 - t, 3);
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          posAttr.array[i3] = start[i3] + (end[i3] - start[i3]) * ease;
          posAttr.array[i3 + 1] = start[i3 + 1] + (end[i3 + 1] - start[i3 + 1]) * ease;
          posAttr.array[i3 + 2] = start[i3 + 2] + (end[i3 + 2] - start[i3 + 2]) * ease;
        }
        posAttr.needsUpdate = true;
        if (t >= 1) bursting = false;
      }
      points.rotation.y += .0012;
      ring.rotation.z += .0016;
      ring2.rotation.z -= .0011;
      camera.position.x += (mouseX * 1.4 - camera.position.x) * .04;
      camera.position.y += (-mouseY * 1 - camera.position.y) * .04;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };
    render(0);

    return {
      start() { active = true; resize(); },
      stop() { active = false; },
      burst,
      fadeIn() { gsapOrFallback(points.material, ring.material, ring2.material); },
      dispose() {
        active = false;
        cancelAnimationFrame(frame);
        geometry.dispose();
        renderer.dispose();
      }
    };

    function gsapOrFallback(pMat, rMat, r2Mat) {
      if (canGsap) {
        gsap.to(pMat, { opacity: .9, duration: 1.4, ease: 'power2.out' });
        gsap.to(rMat, { opacity: .5, duration: 1.6, ease: 'power2.out', delay: .1 });
        gsap.to(r2Mat, { opacity: .35, duration: 1.6, ease: 'power2.out', delay: .2 });
      } else {
        pMat.opacity = .9; rMat.opacity = .5; r2Mat.opacity = .35;
      }
    }
  });

  // ---------- Motion.dev: leve inclinação 3D dos cards ao passar o mouse ----------
  safe('inclinação dos cards (Motion)', () => {
    if (!canMotion || isTouch) return;
    cards.forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        Motion.animate(card, {
          rotateX: ((e.clientY - r.top) / r.height - .5) * -10,
          rotateY: ((e.clientX - r.left) / r.width - .5) * 12,
          translateY: -4
        }, { type: 'spring', stiffness: 260, damping: 18 });
      });
      card.addEventListener('pointerleave', () => {
        Motion.animate(card, { rotateX: 0, rotateY: 0, translateY: 0 }, { type: 'spring', stiffness: 220, damping: 16 });
      });
    });
  });

  // ---------- Motion.dev: botão "soltar mais estrelas" com magnetismo + explosão de brilho ----------
  safe('botão de estrelas (Motion)', () => {
    if (!sparkBtn) return;
    if (canMotion && !isTouch) {
      sparkBtn.addEventListener('pointermove', e => {
        const r = sparkBtn.getBoundingClientRect();
        Motion.animate(sparkBtn, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4 }, { type: 'spring', stiffness: 300, damping: 18 });
      });
      sparkBtn.addEventListener('pointerleave', () => Motion.animate(sparkBtn, { x: 0, y: 0 }, { type: 'spring', stiffness: 250, damping: 16 }));
    }
    sparkBtn.addEventListener('click', () => {
      scene3d?.burst();
      if (canMotion) {
        Motion.animate(flash, { opacity: [0, .55, 0] }, { duration: .9, easing: [.16, 1, .3, 1] });
      } else if (flash) {
        flash.animate([{ opacity: 0 }, { opacity: .55 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
      }
      if (canAnime) anime({ targets: sparkBtn.querySelector('span'), rotate: [0, 360], scale: [1, 1.4, 1], duration: 700, easing: 'easeOutBack' });
    });
  });

  // ---------- GSAP + Anime.js: timeline mestra da entrada, disparada a cada abertura ----------
  let playing = false;
  const playSequence = () => {
    if (playing) return;
    playing = true;
    scene3d?.start();
    scene3d?.fadeIn();
    scene3d?.burst();

    const letters = title.querySelectorAll('.letter');
    const eyebrow = finale.querySelector('.eyebrow');
    const stars = finale.querySelectorAll('.finale-stars span');
    const lead = finale.querySelector('.finale-lead');
    const icons = finale.querySelectorAll('.finale-card-icon');
    const actions = finale.querySelectorAll('.finale-actions > *');
    const footnote = finale.querySelector('.finale-footnote');

    if (canGsap) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(stars, { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: .5, stagger: .08 })
        .fromTo(eyebrow, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5 }, '-=.2')
        .fromTo(lead, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6 }, '-=.1')
        .fromTo(cards, { opacity: 0, y: 26, rotateX: -18 }, { opacity: 1, y: 0, rotateX: 0, duration: .7, stagger: .1, ease: 'power4.out' }, '-=.35')
        .fromTo(actions, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .08 }, '-=.3')
        .fromTo(footnote, { opacity: 0 }, { opacity: 1, duration: .6 }, '-=.2');
      if (canAnime && letters.length) {
        anime.set(letters, { opacity: 0, translateY: 34, rotateZ: () => anime.random(-14, 14), scale: .6 });
        tl.add(() => anime({
          targets: letters,
          opacity: 1,
          translateY: 0,
          rotateZ: 0,
          scale: 1,
          delay: anime.stagger(26),
          duration: 700,
          easing: 'easeOutBack'
        }), 0.05);
      } else {
        gsap.set(letters, { opacity: 1 });
      }
      if (canAnime && icons.length) {
        tl.add(() => {
          anime.set(icons, { scale: 0, rotate: () => anime.random(-30, 30) });
          anime({ targets: icons, scale: [0, 1.3, 1], rotate: 0, delay: anime.stagger(90), duration: 600, easing: 'easeOutElastic(1, .6)' });
        }, '-=.5');
      }
    } else if (canAnime) {
      anime.set([stars, eyebrow, lead, cards, actions, footnote, letters], { opacity: 0, translateY: 16 });
      anime({ targets: [stars, eyebrow, letters, lead, cards, actions, footnote], opacity: [0, 1], translateY: [16, 0], delay: anime.stagger(60, { start: 150 }), duration: 650, easing: 'easeOutCubic' });
    } else {
      [stars, eyebrow, lead, cards, actions, footnote, letters].forEach(group => group && (group.style ? group.style.opacity = 1 : group.forEach?.(el => el.style.opacity = 1)));
    }
  };

  document.addEventListener('finale:open', () => {
    if (reduced) return;
    playSequence();
  });
  document.addEventListener('finale:close', () => {
    playing = false;
    scene3d?.stop();
    if (canGsap) gsap.killTweensOf([title.querySelectorAll('.letter'), finale.querySelectorAll('.finale-cards article, .finale-actions > *, .eyebrow, .finale-lead, .finale-stars span, .finale-footnote')]);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) scene3d?.stop();
    else if (finale.classList.contains('is-open')) scene3d?.start();
  });
})();
