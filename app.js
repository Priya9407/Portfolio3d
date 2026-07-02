/**
 * PORTFOLIO — app.js  (updated)
 * Architecture:
 *   1. Hero + About  → sticky canvas (frames 1–109, ha-wrapper)
 *   2. Experience    → scroll-reveal timeline
 *   3. Projects      → horizontal scroll (no canvas)
 *   4. Skills        → intersection observer reveals
 *   5. Contact       → pure CSS 3D animation scene (NO canvas)
 *
 * Single frame set (frames/) is used for the hero/about sticky canvas only.
 */
'use strict';

/* ══════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════ */
const IS_MOBILE   = () => window.innerWidth <= 768;
const TOTAL       = 70;   // only hero+about frames (1–70)

const HA_START    = 1;
const HA_END      = 70;

const ROLES = [
  'Web Developer',
  'AI Enthusiast',
  'Creative Coder',
  'Problem Solver',
];

/* ══════════════════════════════════════════════════
   DOM REFS
══════════════════════════════════════════════════ */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const loader      = $('loader');
const loaderBar   = $('loaderBar');
const loaderTxt   = $('loaderText');
const navbar      = $('navbar');
const scrollPrg   = $('scrollProgress');
const stageGrad   = $('stageGradient');

// Hero+About canvas
const haCanvas    = $('animCanvas');
const haCtx       = haCanvas.getContext('2d');
const haWrapper   = $('haWrapper');

// Scene overlays
const sceneHero   = $('sceneHero');
const sceneAbout  = $('sceneAbout');
const hiReveal    = $('hiReveal');
const aboutPanel  = $('aboutPanel');
const scrollHint  = $('scrollHint');
const roleWord    = $('roleWord');

// Projects
const projTrack   = $('projectsTrack');
const projSection = $('projects');
const projSpacer  = $('projectsSpacer');

// Orbs
const orbs = $$('.orb');

// Hamburger / mobile menu
const hamburger   = $('navHamburger');
const mobileMenu  = $('mobileMenu');

/* ══════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════ */
let frames        = [];
let loadedCount   = 0;
let haCurFrame    = 1;
let haTargetFrame = 1;
let rafId         = null;
let currentRoleIdx = 0;
let isMobileNow   = IS_MOBILE();
let menuOpen      = false;

/* ══════════════════════════════════════════════════
   HAMBURGER / MOBILE MENU
══════════════════════════════════════════════════ */
function toggleMenu(force) {
  menuOpen = (force !== undefined) ? force : !menuOpen;
  hamburger.classList.toggle('open', menuOpen);
  mobileMenu.classList.toggle('open', menuOpen);
  hamburger.setAttribute('aria-expanded', String(menuOpen));
  document.body.style.overflow = menuOpen ? 'hidden' : '';
}

function setupHamburger() {
  hamburger.addEventListener('click', () => toggleMenu());

  $$('.mobile-menu-link, .mobile-menu-cta').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      toggleMenu(false);
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const key = href.slice(1);
        const el = document.getElementById(key);
        if (el) {
          const top = key === 'home' ? 0 :
                      key === 'about' ? haWrapper.offsetTop + haWrapper.offsetHeight * 0.55 :
                      el.offsetTop;
          window.scrollTo({ top, behavior: 'smooth' });
        } else if (key === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  });

  mobileMenu.addEventListener('click', e => {
    if (e.target === mobileMenu) toggleMenu(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuOpen) toggleMenu(false);
  });
}

/* ══════════════════════════════════════════════════
   FRAME LOADING  (frames 1–70 for hero/about only)
══════════════════════════════════════════════════ */
function frameSrc(n) {
  return `frames/frame_${String(n).padStart(3,'0')}.jpg`;
}

function preloadAll() {
  return new Promise(resolve => {
    for (let n = 1; n <= TOTAL; n++) {
      const img = new Image();
      frames[n] = img;
      img.src   = frameSrc(n);

      img.onload = img.onerror = () => {
        loadedCount++;
        const pct = Math.round((loadedCount / TOTAL) * 100);
        loaderBar.style.width = pct + '%';
        loaderTxt.textContent = `Loading… ${pct}%`;
        if (n === 1 && img.complete) drawHAFrame(img);
        if (loadedCount >= TOTAL) resolve();
      };
    }
  });
}

/* ══════════════════════════════════════════════════
   CANVAS RESIZE
══════════════════════════════════════════════════ */
function resizeCanvases() {
  const dpr = window.devicePixelRatio || 1;
  haCanvas.width  = window.innerWidth  * dpr;
  haCanvas.height = window.innerHeight * dpr;
  haCanvas.style.width  = window.innerWidth  + 'px';
  haCanvas.style.height = window.innerHeight + 'px';
  haCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ══════════════════════════════════════════════════
   DRAW — fit to width, vertically centred
══════════════════════════════════════════════════ */
function drawToCanvas(ctx2d, img) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  ctx2d.clearRect(0, 0, cw, ch);
  ctx2d.fillStyle = '#B8AFA3'; // warm greige — matches frame wall
  ctx2d.fillRect(0, 0, cw, ch);

  if (IS_MOBILE()) {
    // COVER: scale up to fill, crop overflow
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx2d.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  } else {
    // FIT-TO-WIDTH: full bleed width, centred vertically
    const scale = cw / iw;
    const dw = cw, dh = ih * scale;
    const dy = (ch - dh) / 2;
    ctx2d.drawImage(img, 0, 0, iw, ih, 0, dy, dw, dh);
  }
}

function drawHAFrame(img) { drawToCanvas(haCtx, img); }

/* ══════════════════════════════════════════════════
   HA SECTION — progress → frame
══════════════════════════════════════════════════ */
function haProgress() {
  const wrapTop  = haWrapper.offsetTop;
  const wrapH    = haWrapper.offsetHeight;
  const scrolled = window.scrollY - wrapTop;
  const maxScroll= wrapH - window.innerHeight;
  return Math.max(0, Math.min(1, scrolled / maxScroll));
}

function haProgressToFrame(p) {
  return Math.round(HA_START + p * (HA_END - HA_START));
}

/* ══════════════════════════════════════════════════
   SCENE STATE — driven by HA progress
══════════════════════════════════════════════════ */
function updateHAScenes(p) {
  /* ── Hero overlay: visible during first 55% ── */
  const heroVisible = p < 0.55;
  sceneHero.classList.toggle('active', heroVisible);

  if (heroVisible) {
    const heroP = Math.max(0, Math.min(1, p / 0.50));
    const idx = Math.min(ROLES.length - 1, Math.floor(heroP * ROLES.length));
    if (idx !== currentRoleIdx) setRole(idx);
    scrollHint.style.opacity = String(Math.max(0, 1 - p * 4));
  }

  /* ── About overlay: visible during 45–100% ── */
  const aboutVisible = p > 0.45;
  sceneAbout.classList.toggle('active', aboutVisible);

  if (aboutVisible) {
    const hiShow = p > 0.45 && p < 0.68;
    hiReveal.classList.toggle('show', hiShow);
    aboutPanel.classList.toggle('show', p > 0.62);
  }

  /* ── Background mood / orbs ── */
  if (p < 0.5) {
    orbs[0].classList.remove('visible'); orbs[1].classList.remove('visible');
  } else {
    orbs[0].classList.add('visible'); orbs[1].classList.add('visible');
  }

  /* ── Nav active ── */
  $$('.nav-link, .mobile-menu-link').forEach(a => {
    const s = a.dataset.section;
    a.classList.toggle('active',
      (p < 0.5 && s === 'home') || (p >= 0.5 && s === 'about')
    );
  });
}

/* ══════════════════════════════════════════════════
   ROLE CYCLING
══════════════════════════════════════════════════ */
function setRole(idx) {
  if (idx === currentRoleIdx) return;
  currentRoleIdx = idx;
  roleWord.classList.add('fade-out');
  setTimeout(() => {
    roleWord.textContent = ROLES[idx];
    roleWord.classList.remove('fade-out');
    roleWord.classList.add('fade-in');
    requestAnimationFrame(() => requestAnimationFrame(() => roleWord.classList.remove('fade-in')));
  }, 220);
}

/* ══════════════════════════════════════════════════
   PROJECTS — HORIZONTAL SCROLL
══════════════════════════════════════════════════ */
function setupProjectsSpacer() {
  if (IS_MOBILE()) {
    projSpacer.style.height = '0px';
    return;
  }
  const trackW   = projTrack.scrollWidth;
  const viewW    = window.innerWidth;
  const overflow = Math.max(0, trackW - viewW + 96);
  projSpacer.style.height = overflow + 'px';
}

function updateProjectsScroll() {
  if (IS_MOBILE()) { projTrack.style.transform = 'none'; return; }

  const sectionTop = projSection.offsetTop;
  const sectionH   = projSection.offsetHeight;
  const scrolled   = window.scrollY - sectionTop;
  const maxScroll  = sectionH - window.innerHeight;
  const p          = Math.max(0, Math.min(1, scrolled / maxScroll));

  const trackW   = projTrack.scrollWidth;
  const viewW    = window.innerWidth;
  const maxTx    = -(trackW - viewW + 96);
  projTrack.style.transform = `translateX(${p * maxTx}px)`;

  if (p > 0) {
    $$('.nav-link, .mobile-menu-link').forEach(a =>
      a.classList.toggle('active', a.dataset.section === 'projects')
    );
  }
}

/* ══════════════════════════════════════════════════
   SCROLL REVEAL — IntersectionObserver
══════════════════════════════════════════════════ */
function setupScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // Reveal all .reveal elements
  $$('.reveal, .reveal-left, .reveal-right').forEach((el, i) => {
    // Stagger sibling items
    const parent = el.parentElement;
    const siblings = parent ? Array.from(parent.querySelectorAll('.reveal, .reveal-left, .reveal-right')) : [];
    const sibIdx = siblings.indexOf(el);
    if (sibIdx > 0) el.style.transitionDelay = (sibIdx * 80) + 'ms';
    io.observe(el);
  });

  // Skills cards stagger
  const skillIo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        skillIo.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  $$('.skill-group').forEach((el, i) => {
    el.style.transitionDelay = (i * 90) + 'ms';
    skillIo.observe(el);
  });

  // Timeline items stagger
  const tlIo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        tlIo.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  $$('.timeline-item').forEach((el, i) => {
    el.style.transitionDelay = (i * 120) + 'ms';
    tlIo.observe(el);
  });
}

/* ══════════════════════════════════════════════════
   3D TILT EFFECT — project & skill cards
══════════════════════════════════════════════════ */
function setupTilt(selector, maxTilt) {
  $$(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top)  / r.height;
      const rx = (0.5 - py) * maxTilt;
      const ry = (px - 0.5) * maxTilt;
      card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* ══════════════════════════════════════════════════
   CONTACT FORM — prefilled mailto
══════════════════════════════════════════════════ */
function setupContactForm() {
  const form = $('contactForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name    = ($('cfName')?.value    || '').trim();
    const email   = ($('cfEmail')?.value   || '').trim();
    const subject = ($('cfSubject')?.value || '').trim();
    const message = ($('cfMessage')?.value || '').trim();

    const subj = encodeURIComponent(subject || `Portfolio inquiry from ${name || 'a visitor'}`);
    const body  = encodeURIComponent(
      `${message}\n\n—\nFrom: ${name}\nReply-to: ${email}`
    );
    window.location.href = `mailto:priya9407@example.com?subject=${subj}&body=${body}`;
  });
}

/* ══════════════════════════════════════════════════
   NAVBAR ACTIVE + SCROLLED STATE
══════════════════════════════════════════════════ */
function updateNavActive(sy) {
  const sections = ['experience','projects','skills','contact'];
  let active = null;
  for (const id of sections) {
    const el = document.getElementById(id);
    if (el && sy >= el.offsetTop - window.innerHeight * 0.4) {
      active = id;
    }
  }
  if (!active) return; // hero/about handled by HA progress
  $$('.nav-link, .mobile-menu-link').forEach(a => {
    a.classList.toggle('active', a.dataset.section === active);
  });
}

/* ══════════════════════════════════════════════════
   SCROLL HANDLER
══════════════════════════════════════════════════ */
function onScroll() {
  const sy  = window.scrollY;
  const max = document.body.scrollHeight - window.innerHeight;
  const gp  = max > 0 ? sy / max : 0;

  // Progress bar
  scrollPrg.style.width = (gp * 100) + '%';

  // Navbar visibility + scrolled glass
  navbar.classList.toggle('visible', sy > 20);
  navbar.classList.toggle('scrolled', sy > 60);

  // Which zone are we in?
  const haBottom = haWrapper.offsetTop + haWrapper.offsetHeight;

  if (sy < haBottom) {
    // Hero / About zone
    const p = haProgress();
    haTargetFrame = haProgressToFrame(p);
    updateHAScenes(p);
  } else {
    // Everything below — projects / skills / contact
    updateProjectsScroll();
    updateNavActive(sy);
  }

  // Always update projects scroll
  updateProjectsScroll();
}

/* ══════════════════════════════════════════════════
   RAF RENDER LOOP — smooth frame lerp
══════════════════════════════════════════════════ */
function loop() {
  rafId = requestAnimationFrame(loop);

  haCurFrame += (haTargetFrame - haCurFrame) * 0.18;
  const haIdx = Math.max(HA_START, Math.min(HA_END, Math.round(haCurFrame)));
  const haImg = frames[haIdx];
  if (haImg && haImg.complete && haImg.naturalWidth) drawHAFrame(haImg);
}

/* ══════════════════════════════════════════════════
   NAV SMOOTH SCROLL
══════════════════════════════════════════════════ */
function setupNav() {
  $$('.nav-link, .btn-primary, .btn-ghost, .nav-cta').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const key = href.slice(1);

    a.addEventListener('click', e => {
      e.preventDefault();
      let top = 0;
      if (key === 'home') {
        top = 0;
      } else if (key === 'about') {
        top = haWrapper.offsetTop + haWrapper.offsetHeight * 0.55;
      } else {
        const el = document.getElementById(key);
        if (el) top = el.offsetTop;
      }
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ══════════════════════════════════════════════════
   PARALLAX on 3D CONTACT SHAPES — mouse tracking
══════════════════════════════════════════════════ */
function setupContactParallax() {
  const contactSection = document.getElementById('contact');
  if (!contactSection || IS_MOBILE()) return;

  const shapes = $$('.contact-3d-bg .shape');
  contactSection.addEventListener('mousemove', e => {
    const r  = contactSection.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width  - 0.5; // -0.5 to 0.5
    const my = (e.clientY - r.top)  / r.height - 0.5;

    shapes.forEach((el, i) => {
      const depth = (i % 3 + 1) * 8; // different parallax depths
      const tx = mx * depth;
      const ty = my * depth;
      el.style.setProperty('--px', tx.toFixed(1) + 'px');
      el.style.setProperty('--py', ty.toFixed(1) + 'px');
    });
  });

  contactSection.addEventListener('mouseleave', () => {
    shapes.forEach(el => {
      el.style.setProperty('--px', '0px');
      el.style.setProperty('--py', '0px');
    });
  });
}

/* ══════════════════════════════════════════════════
   RESIZE HANDLER
══════════════════════════════════════════════════ */
function onResize() {
  isMobileNow = IS_MOBILE();
  resizeCanvases();
  setupProjectsSpacer();
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
async function init() {
  resizeCanvases();
  setupHamburger();

  // Preload frames 1–70
  await preloadAll();

  // Small settle delay
  await new Promise(r => setTimeout(r, 250));

  // Hide loader
  loader.classList.add('hidden');

  // Setup everything
  setupProjectsSpacer();
  setupScrollReveal();
  setupNav();
  setupContactForm();
  setupContactParallax();

  if (!IS_MOBILE()) {
    setupTilt('.pcard', 8);
    setupTilt('.skill-group', 6);
  }

  // Render first frame
  const f1 = frames[1];
  if (f1 && f1.complete) drawHAFrame(f1);

  // Activate hero scene
  sceneHero.classList.add('active');
  roleWord.textContent = ROLES[0];

  // Navbar visible after brief delay
  setTimeout(() => navbar.classList.add('visible'), 500);

  // Listeners
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  // Start render loop
  loop();

  // Trigger scroll once to set initial state
  onScroll();
}

window.addEventListener('DOMContentLoaded', init);