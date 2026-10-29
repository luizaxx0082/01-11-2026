const letterBtn = document.querySelector('#letterBtn');
const hiddenMessage = document.querySelector('#hiddenMessage');
const toast = document.querySelector('#toast');
const surpriseBtn = document.querySelector('#surpriseBtn');
const confettiBtn = document.querySelector('#confettiBtn');
const soundBtn = document.querySelector('#soundBtn');
const birthdayAudio = document.querySelector('#birthdayAudio');
const magicText = document.querySelector('#magicText');
const magicBtn = document.querySelector('#magicBtn');
const finaleScreen = document.querySelector('#finaleScreen');
const finaleExit = document.querySelector('#finaleExit');
const finaleClose = document.querySelector('#finaleClose');
let magicTimer = null;
let magicRun = 0;
let finaleShown = false;

letterBtn.addEventListener('click', () => {
  const opening = !hiddenMessage.classList.contains('open');
  hiddenMessage.classList.toggle('open', opening);
  letterBtn.innerHTML = opening ? 'fechar mensagem <span><i data-lucide="arrow-up" class="ico"></i></span>' : 'ler uma última coisa <span><i data-lucide="arrow-right" class="ico"></i></span>';
  if (window.lucide) lucide.createIcons();
  if (window.gsap) {
    // CSS não sabe animar até height:auto (só "pula"); medimos a altura real e animamos com GSAP.
    gsap.killTweensOf(hiddenMessage);
    hiddenMessage.style.transition = 'none';
    if (opening) {
      gsap.set(hiddenMessage, { height: 'auto' });
      const target = hiddenMessage.offsetHeight;
      gsap.fromTo(hiddenMessage, { height: 0, marginTop: 0, opacity: 0, y: 10 }, { height: target, marginTop: 55, opacity: 1, y: 0, duration: .6, ease: 'power3.inOut', onComplete: () => { hiddenMessage.style.height = 'auto'; hiddenMessage.style.transition = ''; } });
    } else {
      const current = hiddenMessage.offsetHeight;
      gsap.fromTo(hiddenMessage, { height: current }, { height: 0, marginTop: 0, opacity: 0, y: 10, duration: .45, ease: 'power3.inOut', onComplete: () => { hiddenMessage.style.transition = ''; } });
    }
  }
});

function showToast(message) {
  toast.innerHTML = message;
  if (window.lucide) lucide.createIcons();
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

surpriseBtn.addEventListener('click', () => {
  document.querySelector('.hero').animate([{filter:'brightness(1)'},{filter:'brightness(1.25)'},{filter:'brightness(1)'}], {duration:650, easing:'ease-out'});
  showToast('Psiu… você deixa esse mundo bem mais legal <i data-lucide="sparkle" class="ico"></i>');
});

confettiBtn.addEventListener('click', () => {
  finaleScreen.classList.add('is-open');
  finaleScreen.setAttribute('aria-hidden', 'false');
  document.body.classList.add('finale-open');
  document.dispatchEvent(new CustomEvent('finale:open'));
});

function closeFinale() {
  cancelFarewell();
  finaleScreen.classList.add('is-closing');
  finaleScreen.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('finale-open');
  document.dispatchEvent(new CustomEvent('finale:close'));
  setTimeout(() => {
    finaleScreen.classList.remove('is-open', 'is-closing');
  }, 850);
}

// ---------- lembrança pra baixar + sequência de despedida ao clicar em "guardar esse carinho" ----------
let farewellTimers = [];

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '', curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
  return curY;
}

function drawCanvasSparkle(ctx, x, y, size, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#d7ad72';
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * .15, -size * .15, size, 0);
  ctx.quadraticCurveTo(size * .15, size * .15, 0, size);
  ctx.quadraticCurveTo(-size * .15, size * .15, -size, 0);
  ctx.quadraticCurveTo(-size * .15, -size * .15, 0, -size);
  ctx.fill();
  ctx.restore();
}

function buildMementoDataURL() {
  const w = 1080, h = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createRadialGradient(w / 2, h * .32, 0, w / 2, h * .32, h * .95);
  bg.addColorStop(0, '#743d5d');
  bg.addColorStop(.55, '#321b2d');
  bg.addColorStop(1, '#0f0910');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(215,173,114,.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  [[120, 170, 13, .8], [945, 200, 10, .55], [890, 1175, 16, .7], [150, 1190, 11, .5], [545, 120, 8, .45]]
    .forEach(([x, y, s, a]) => drawCanvasSparkle(ctx, x, y, s, a));

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d7ad72';
  ctx.font = '600 22px "DM Sans", sans-serif';
  ctx.fillText('U M A   L E M B R A N Ç A   P R A   V O C Ê', w / 2, 210);

  ctx.fillStyle = '#ffffff';
  ctx.font = '500 92px "Playfair Display", serif';
  ctx.fillText('Feliz aniversário,', w / 2, 460);

  ctx.fillStyle = '#f2c1c8';
  ctx.font = 'italic 500 108px "Playfair Display", serif';
  ctx.fillText('Luiza.', w / 2, 600);

  ctx.fillStyle = '#e7d6da';
  ctx.font = '400 29px "DM Sans", sans-serif';
  wrapCanvasText(ctx, 'Que esse ano novo seja tão bom quanto você é pra galera que tem a sorte de te conhecer.', w / 2, 710, 780, 44);

  ctx.fillStyle = '#d7ad72';
  ctx.font = '600 21px "DM Sans", sans-serif';
  ctx.fillText('COM CARINHO, HOJE E SEMPRE · 2026', w / 2, h - 85);

  return canvas.toDataURL('image/png');
}

function downloadMemento() {
  try {
    const link = document.createElement('a');
    link.href = buildMementoDataURL();
    link.download = 'feliz-aniversario-luiza.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.warn('Não foi possível gerar a lembrança:', err);
  }
}

function cancelFarewell() {
  farewellTimers.forEach(clearTimeout);
  farewellTimers = [];
  const goodbye = document.querySelector('#finaleGoodbye');
  const goodbyeText = goodbye.querySelector('.finale-goodbye-text');
  finaleScreen.classList.remove('is-farewell', 'is-content-hidden');
  goodbye.classList.remove('is-active');
  goodbyeText.classList.remove('is-visible');
  goodbye.setAttribute('aria-hidden', 'true');
  finaleExit.disabled = false;
}

function playFarewellSequence() {
  const goodbye = document.querySelector('#finaleGoodbye');
  const goodbyeText = goodbye.querySelector('.finale-goodbye-text');
  finaleScreen.classList.add('is-farewell');
  goodbye.setAttribute('aria-hidden', 'false');

  const at = (ms, fn) => farewellTimers.push(setTimeout(fn, ms));

  finaleScreen.classList.add('is-content-hidden');
  at(150, () => goodbye.classList.add('is-active'));
  at(850, () => goodbyeText.classList.add('is-visible'));
  at(3250, () => goodbyeText.classList.remove('is-visible'));
  at(4350, () => { try { window.close(); } catch (err) { /* navegador não deixa fechar aba aberta pelo usuário */ } });
  at(4950, () => {
    if (!document.hidden) closeFinale();
  });
}

finaleExit.addEventListener('click', async () => {
  finaleExit.disabled = true;
  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 400))]);
    }
  } catch (err) { /* segue mesmo assim */ }
  downloadMemento();
  playFarewellSequence();
});
finaleClose.addEventListener('click', closeFinale);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && finaleScreen.classList.contains('is-open')) closeFinale();
});

soundBtn.addEventListener('click', () => {
  if (birthdayAudio.paused) {
    birthdayAudio.play().then(() => {
      document.querySelector('#soundText').textContent='pausar áudio';
      soundBtn.setAttribute('aria-label', 'Pausar áudio ambiente');
      soundBtn.setAttribute('aria-pressed', 'true');
    }).catch(() => showToast('Adicione o arquivo audio.m4a na raiz da página'));
  } else {
    birthdayAudio.pause();
    document.querySelector('#soundText').textContent='tocar áudio';
    soundBtn.setAttribute('aria-label', 'Tocar áudio ambiente');
    soundBtn.setAttribute('aria-pressed', 'false');
  }
});

birthdayAudio.addEventListener('ended', () => {
  document.querySelector('#soundText').textContent='tocar áudio';
  soundBtn.setAttribute('aria-label', 'Tocar áudio ambiente');
  soundBtn.setAttribute('aria-pressed', 'false');
});

function revealMagicText() {
  const text = magicText.dataset.text;
  const currentRun = ++magicRun;
  if (magicTimer) clearTimeout(magicTimer);
  magicBtn.disabled = true;
  magicBtn.setAttribute('aria-busy', 'true');
  magicText.textContent = '';
  let index = 0;
  const type = () => {
    if (currentRun !== magicRun) return;
    if (index < text.length) {
      magicText.textContent += text[index++];
      magicTimer = setTimeout(type, text[index - 1] === ' ' ? 35 : 52);
    } else {
      magicTimer = null;
      magicBtn.disabled = false;
      magicBtn.removeAttribute('aria-busy');
    }
  };
  type();
}

magicBtn.addEventListener('click', revealMagicText);
setTimeout(revealMagicText, 700);

document.addEventListener('click', (event) => {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${event.clientX - 8}px`;
  ripple.style.top = `${event.clientY - 8}px`;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
  const sparkTemplate = document.querySelector('#sparkTemplate');
  for (let i = 0; i < 3; i++) {
    const spark = document.createElement('span');
    spark.className = 'spark';
    if (sparkTemplate) {
      const icon = sparkTemplate.cloneNode(true);
      icon.classList.remove('spark-template-hidden');
      icon.removeAttribute('id');
      spark.appendChild(icon);
    }
    spark.style.left = `${event.clientX - 8}px`; spark.style.top = `${event.clientY - 8}px`;
    spark.style.setProperty('--dx', `${(Math.random() - .5) * 55}px`);
    spark.style.setProperty('--dy', `${-20 - Math.random() * 35}px`);
    spark.style.animationDelay = `${i * 35}ms`;
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 900);
  }
});

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) entry.target.classList.add('is-visible');
}), {threshold:.14});

document.querySelectorAll('main > section:not(.hero), footer').forEach(section => {
  section.classList.add('scroll-reveal');
  observer.observe(section);
});
document.querySelectorAll('.letter-grid,.cards,.marquee-track,.magic-card,.wish-inner').forEach(group => {
  group.classList.add('scroll-reveal-stagger');
  observer.observe(group);
});

function launchFinale() {
  if (finaleShown || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  finaleShown = true;
  const layer = document.createElement('div');
  layer.className = 'celebration-layer';
  const colors = ['#d7ad72','#c98f91','#f5eee5','#a96c80','#fff'];
  for (let i = 0; i < 72; i++) {
    const confetti = document.createElement('i');
    confetti.className = 'celebration-confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.setProperty('--color', colors[i % colors.length]);
    confetti.style.setProperty('--duration', `${2.3 + Math.random() * 2}s`);
    confetti.style.setProperty('--delay', `${Math.random() * .45}s`);
    confetti.style.setProperty('--drift', `${(Math.random() - .5) * 180}px`);
    confetti.style.setProperty('--rotation', `${Math.random() * 180}deg`);
    layer.appendChild(confetti);
  }
  for (let i = 0; i < 8; i++) {
    const balloon = document.createElement('i');
    balloon.className = 'party-balloon';
    balloon.style.left = `${5 + Math.random() * 90}%`;
    balloon.style.setProperty('--color', colors[i % colors.length]);
    balloon.style.setProperty('--duration', `${4.2 + Math.random() * 2.3}s`);
    balloon.style.setProperty('--delay', `${Math.random() * .5}s`);
    balloon.style.setProperty('--drift', `${(Math.random() - .5) * 180}px`);
    balloon.style.setProperty('--tilt', `${(Math.random() - .5) * 18}deg`);
    layer.appendChild(balloon);
  }
  const title = document.createElement('div');
  title.className = 'celebration-title';
  title.innerHTML = 'Feliz aniversário, Luiza <i data-lucide="sparkle" class="ico"></i>';
  layer.appendChild(title);
  document.body.appendChild(layer);
  if (window.lucide) lucide.createIcons();
  setTimeout(() => layer.remove(), 7200);
}

window.addEventListener('scroll', () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
  if (nearBottom) launchFinale();
}, {passive:true});

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
});
