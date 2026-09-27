(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Intro ---------- */
  const start = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]).then(start);
  } else start();

  /* ---------- Theme ---------- */
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
  $('#themeToggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('theme', next);
  });

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const burger = $('#navBurger');
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  const navLinks = $$('#navLinks a');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'work', 'experience', 'skills', 'education', 'contact'].forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* ---------- Reveal on scroll ---------- */
  const onVisible = new Map(); // element -> callback when it first appears
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-visible', 'in-view');
      revealObserver.unobserve(el);
      const cb = onVisible.get(el);
      if (cb) cb(el);
      // Hand control back to hover styles once the entrance has finished
      if (el.classList.contains('reveal')) {
        setTimeout(() => el.classList.remove('reveal', 'is-visible'), 1400);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  const whenVisible = (el, cb) => {
    if (cb) onVisible.set(el, cb);
    revealObserver.observe(el);
  };
  $$('.reveal').forEach(el => whenVisible(el));

  /* ---------- Count-up stats ---------- */
  $$('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const format = v => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    el.textContent = format(reduceMotion ? target : 0);
    if (reduceMotion) return;
    const host = el.closest('.stat');
    const run = () => {
      const dur = 1800;
      const t0 = performance.now();
      const tick = now => {
        const p = clamp((now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = format(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    host.classList.contains('reveal') ? onVisible.set(host, run) : run();
  });

  /* ---------- Education rings ---------- */
  $$('.ring').forEach(ring => {
    const bar = $('.ring__bar', ring);
    const circumference = 2 * Math.PI * 52;
    const value = parseFloat(ring.dataset.value);
    const fill = () => { bar.style.strokeDashoffset = String(circumference * (1 - value / 100)); };
    const card = ring.closest('.reveal');
    if (card) onVisible.set(card, fill); else fill();
  });

  /* ---------- Statement: word-by-word reveal ---------- */
  const statement = $('.statement');
  const statementText = $('#statementText');
  const words = statementText.textContent.trim().split(/\s+/);
  statementText.innerHTML = words.map(w => `<span class="w">${w}</span> `).join('');
  const wordEls = $$('.w', statementText);
  if (reduceMotion) wordEls.forEach(w => w.classList.add('is-on'));

  /* ---------- Scroll-linked effects ---------- */
  const progressBar = $('.scroll-progress span');
  const heroContent = $('#heroContent');
  const hero = $('.hero');
  const scrollHint = $('.scroll-hint');
  const zoom = $('.zoom');
  const zoomText = $('#zoomText');
  const timeline = $('#timeline');
  const timelineFill = $('#timelineFill');
  let ticking = false;

  const sectionProgress = el => {
    const r = el.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;

    progressBar.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;
    nav.classList.toggle('is-scrolled', y > 10);

    if (reduceMotion) return;

    // Hero recedes as you scroll away
    const hp = clamp(y / (hero.offsetHeight * 0.85));
    heroContent.style.transform = `translate3d(0, ${hp * 60}px, 0) scale(${1 - hp * 0.12})`;
    heroContent.style.opacity = String(1 - hp * 1.1);
    scrollHint.style.opacity = String(0.7 * (1 - clamp(y / 200)));

    // Statement words light up
    const sp = clamp(sectionProgress(statement) * 1.15);
    const lit = Math.round(sp * wordEls.length);
    for (let i = 0; i < wordEls.length; i++) wordEls[i].classList.toggle('is-on', i < lit);

    // Big zoom statement
    const zp = sectionProgress(zoom);
    const inPhase = clamp(zp / 0.45);
    const outPhase = clamp((zp - 0.75) / 0.25);
    const scale = 1.9 - 0.9 * (1 - Math.pow(1 - inPhase, 3));
    zoomText.style.transform = `scale(${scale - outPhase * 0.08})`;
    zoomText.style.opacity = String(clamp(inPhase * 1.4) * (1 - outPhase));

    // Timeline line fills
    const tr = timeline.getBoundingClientRect();
    const tp = clamp((vh * 0.6 - tr.top) / tr.height);
    timelineFill.style.transform = `scaleY(${tp})`;
  };

  const requestUpdate = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();

  /* ---------- Pointer spotlight & tilt ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-spotlight]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });

    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (el.classList.contains('reveal')) return; // wait for entrance to finish
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1600px) rotateX(${py * -2.5}deg) rotateY(${px * 3}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Sentiment app illustration ---------- */
  const samples = [
    { text: 'An absolute joy from start to finish.', pos: true, conf: 0.97 },
    { text: 'The plot was dull and painfully slow.', pos: false, conf: 0.94 },
    { text: 'Beautifully shot, with a heartfelt story.', pos: true, conf: 0.95 },
    { text: 'I wanted to like it, but it fell flat.', pos: false, conf: 0.86 },
  ];
  const saText = $('#saText');
  const saResult = $('#saResult');
  const saPill = $('#saPill');
  const saBar = $('#saBar');
  const saHistory = $('#saHistory');
  const saProject = saText.closest('.project');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let saRunning = false;
  let saVisible = false;

  const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const runSentiment = async () => {
    if (saRunning) return;
    saRunning = true;
    let i = 0;
    while (saVisible) {
      const s = samples[i % samples.length];
      saResult.classList.remove('is-on');
      saBar.style.width = '0';
      saText.textContent = '';
      for (const ch of s.text) {
        if (!saVisible) break;
        saText.textContent += ch;
        await wait(reduceMotion ? 0 : 38 + Math.random() * 40);
      }
      await wait(350);
      saPill.textContent = s.pos ? 'Positive' : 'Negative';
      saPill.classList.toggle('is-neg', !s.pos);
      saBar.classList.toggle('is-neg', !s.pos);
      saResult.classList.add('is-on');
      await wait(60);
      saBar.style.width = `${s.conf * 100}%`;
      await wait(2200);
      const item = document.createElement('div');
      item.className = 'sa__hist-item';
      item.innerHTML = `<span>${escapeHtml(s.text)}</span><b class="${s.pos ? '' : 'is-neg'}">${s.pos ? 'Positive' : 'Negative'}</b>`;
      saHistory.prepend(item);
      while (saHistory.children.length > 2) saHistory.lastElementChild.remove();
      i++;
    }
    saRunning = false;
  };
  new IntersectionObserver(entries => {
    saVisible = entries[0].isIntersecting;
    if (saVisible) runSentiment();
  }, { threshold: 0.2 }).observe(saProject);

  /* ---------- Live GitHub repositories ---------- */
  const repoGrid = $('#repoGrid');
  const FEATURED = ['diabetes-risk-predictor', 'sentiment-analyzer'];
  const LANG_COLORS = {
    Python: '#3572A5', 'Jupyter Notebook': '#DA5B0B', JavaScript: '#f1e05a', TypeScript: '#3178c6',
    HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', 'C++': '#f34b7d', C: '#555555', Dart: '#00B4AB', Kotlin: '#A97BFF',
  };
  const prettyName = n => n.replace(/[-_]+/g, ' ').trim();

  const renderRepos = repos => {
    const list = repos
      .filter(r => !r.fork && !FEATURED.includes(r.name.toLowerCase()))
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 6);
    if (!list.length) throw new Error('empty');
    repoGrid.innerHTML = list.map((r, i) => `
      <a class="repo" href="${r.html_url}" target="_blank" rel="noopener" style="animation-delay:${i * 70}ms">
        <span class="repo__name">${escapeHtml(prettyName(r.name))}</span>
        <span class="repo__desc">${escapeHtml(r.description || 'Source code and experiments on GitHub.')}</span>
        <span class="repo__meta">${r.language ? `<span class="repo__dot" style="background:${LANG_COLORS[r.language] || 'var(--text-3)'}"></span>${escapeHtml(r.language)}` : 'Repository'}${r.stargazers_count ? ` · ★ ${r.stargazers_count}` : ''}</span>
      </a>`).join('');
  };
  const repoFallback = () => {
    repoGrid.innerHTML = `
      <a class="repo" href="https://github.com/abdurhaq?tab=repositories" target="_blank" rel="noopener">
        <span class="repo__name">All repositories</span>
        <span class="repo__desc">Browse every project, experiment and practice repo on my GitHub profile.</span>
        <span class="repo__meta">github.com/abdurhaq</span>
      </a>`;
  };
  const loadRepos = async () => {
    try {
      const cached = sessionStorage.getItem('repos');
      if (cached) return renderRepos(JSON.parse(cached));
    } catch (e) {}
    try {
      const res = await fetch('https://api.github.com/users/abdurhaq/repos?per_page=100&sort=pushed', { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      renderRepos(data);
      try { sessionStorage.setItem('repos', JSON.stringify(data.map(({ name, description, language, html_url, pushed_at, fork, stargazers_count }) => ({ name, description, language, html_url, pushed_at, fork, stargazers_count })))); } catch (e) {}
    } catch (e) {
      repoFallback();
    }
  };
  // Load when the section approaches the viewport
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { obs.disconnect(); loadRepos(); }
  }, { rootMargin: '600px 0px' }).observe(repoGrid);

  /* ---------- Contact form ---------- */
  const form = $('#contactForm');
  const statusEl = $('#formStatus');
  const submitBtn = $('#cfSubmit');
  const EMAIL = 'abdurrahman7913@gmail.com';
  const setStatus = (msg, kind) => {
    statusEl.textContent = msg;
    statusEl.className = 'form-status' + (kind ? ` is-${kind}` : '');
  };

  form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-invalid'));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data._honey) return; // bot

    let firstInvalid = null;
    const check = (name, ok) => {
      const field = form.elements[name].closest('.field');
      field.classList.toggle('is-invalid', !ok);
      if (!ok && !firstInvalid) firstInvalid = form.elements[name];
    };
    check('name', data.name.trim().length > 1);
    check('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()));
    check('message', data.message.trim().length > 4);
    if (firstInvalid) {
      setStatus('Please fill in every field with a valid value.', 'err');
      firstInvalid.focus();
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    setStatus('Sending…');
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          message: data.message.trim(),
          _replyto: data.email.trim(),
          _subject: `Portfolio message from ${data.name.trim()}`,
          _template: 'table',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || 'failed');
      form.reset();
      setStatus('Thanks! Your message is on its way — I’ll get back to you soon.', 'ok');
    } catch (err) {
      statusEl.className = 'form-status is-err';
      statusEl.innerHTML = `Couldn’t send right now. Please email me directly at <a href="mailto:${EMAIL}">${EMAIL}</a>.`;
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });
})();
