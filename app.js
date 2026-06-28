/**
 * PORTFOLIO — app.js
 * Architecture:
 *   1. Hero + About  → sticky canvas (frames 1–109, ha-wrapper)
 *   2. Projects      → horizontal scroll (no canvas)
 *   3. Skills        → intersection observer reveals
 *   4. Contact       → sticky canvas (frames 110–146, contact-wrapper)
 *
 * Mobile: uses frames1/ folder (portrait-cropped)
 * Desktop: uses frames/ folder
 */
'use strict';

/* ══════════════════════════════════════════════════
   MOBILE DETECTION & FRAME CONFIG
══════════════════════════════════════════════════ */
const IS_MOBILE   = () => window.innerWidth <= 768;
const FRAME_DIR   = () => IS_MOBILE() ? 'frames2/' : 'frames/';
const TOTAL       = 146;

/* Frame ranges */
const HA_START    = 1;    // hero+about canvas start
const HA_END      = 70;  // hero+about canvas end
const HA_WAVE     = 73;   // frame where character waves "Hi"

const CTX_START   = 70;  // contact canvas start
const CTX_END     = 146;  // contact canvas end

/* Role texts for hero cycling */
const ROLES = [
  'Web Developer',
  'UI/UX Designer',
  'Coder',
  'Creative Builder',
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

// Contact canvas
const ctxCanvas   = $('contactCanvas');
const ctxCtx      = ctxCanvas.getContext('2d');
const ctxWrapper  = $('contactWrapper');

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

// Contact overlay
const ctxOverlay  = $('contactOverlay');
const socialRow   = $('socialRow');

// Orbs
const orbs = $$('.orb');

// Hamburger / mobile menu
const hamburger   = $('navHamburger');
const mobileMenu  = $('mobileMenu');

/* ══════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════ */
let frames       = [];          // all frame Image objects [1..146]
let loadedCount  = 0;
let haCurFrame   = 1;           // currently rendered HA frame (lerped)
let haTargetFrame= 1;
let ctxCurFrame  = CTX_START;   // currently rendered Contact frame (lerped)
let ctxTargetFrame = CTX_START;
let rafId        = null;
let currentRoleIdx = 0;
let roleTimeout  = null;
let isMobileNow  = IS_MOBILE();
let menuOpen     = false;

/* ══════════════════════════════════════════════════
   HAMBURGER / MOBILE MENU
══════════════════════════════════════════════════ */
function toggleMenu(force) {
  menuOpen = (force !== undefined) ? force : !menuOpen;
  hamburger.classList.toggle('open', menuOpen);
  mobileMenu.classList.toggle('open', menuOpen);
  hamburger.setAttribute('aria-expanded', String(menuOpen));
  // Prevent body scroll when menu is open
  document.body.style.overflow = menuOpen ? 'hidden' : '';
}

function setupHamburger() {
  hamburger.addEventListener('click', () => toggleMenu());

  // Close on any mobile menu link click
  $$('.mobile-menu-link, .mobile-menu-cta').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      toggleMenu(false);
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const key = href.slice(1);
        const targets = {
          home:     () => 0,
          about:    () => haWrapper.offsetTop + haWrapper.offsetHeight * 0.55,
          projects: () => projSection.offsetTop,
          skills:   () => ($('skills') || {}).offsetTop || 0,
          contact:  () => ctxWrapper.offsetTop,
        };
        if (targets[key]) {
          window.scrollTo({ top: targets[key](), behavior: 'smooth' });
        }
      }
    });
  });

  // Close on backdrop click (clicking outside the links)
  mobileMenu.addEventListener('click', e => {
    if (e.target === mobileMenu) toggleMenu(false);
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuOpen) toggleMenu(false);
  });
}

/* ══════════════════════════════════════════════════
   FRAME LOADING
══════════════════════════════════════════════════ */
function frameSrc(n) {
  const dir    = IS_MOBILE() ? 'frames2/' : 'frames/';
  const padded = String(n).padStart(3, '0');
  return `${dir}frame_${padded}.jpg`;
}

function preloadAll() {
  return new Promise(resolve => {
    for (let n = 1; n <= TOTAL; n++) {
      const img = new Image();
      frames[n]  = img;
      img.src    = frameSrc(n);

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
   CANVAS RESIZE — fit to width
══════════════════════════════════════════════════ */
function resizeCanvases() {
  const dpr = window.devicePixelRatio || 1;
  [haCanvas, ctxCanvas].forEach(c => {
    c.width  = window.innerWidth  * dpr;
    c.height = window.innerHeight * dpr;
    c.style.width  = window.innerWidth  + 'px';
    c.style.height = window.innerHeight + 'px';
  });
  // Re-scale contexts
  haCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ══════════════════════════════════════════════════
   DRAW — fit to WIDTH (full bleed, vertically centred)
══════════════════════════════════════════════════ */
function drawToCanvas(ctx2d, canvas2d, img) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = cw / iw;          // fit to full width
  const dw    = cw;
  const dh    = ih * scale;
  const dy    = (ch - dh) / 2;    // vertically centred

  ctx2d.clearRect(0, 0, cw, ch);
  ctx2d.fillStyle = '#B8AFA3';    // warm greige — matches frame wall
  ctx2d.fillRect(0, 0, cw, ch);
  ctx2d.drawImage(img, 0, 0, iw, ih, 0, dy, dw, dh);
}

function drawHAFrame(img)  { drawToCanvas(haCtx,  haCanvas,  img); }
function drawCtxFrame(img) { drawToCanvas(ctxCtx, ctxCanvas, img); }

/* ══════════════════════════════════════════════════
   HA SECTION — progress → frame (frames 1–109)
══════════════════════════════════════════════════ */
function haProgress() {
  const wrapTop    = haWrapper.offsetTop;
  const wrapH      = haWrapper.offsetHeight; // includes ha-spacer
  const scrolled   = window.scrollY - wrapTop;
  const maxScroll  = wrapH - window.innerHeight;
  return Math.max(0, Math.min(1, scrolled / maxScroll));
}

function haProgressToFrame(p) {
  return Math.round(HA_START + p * (HA_END - HA_START));
}

/* ══════════════════════════════════════════════════
   CONTACT SECTION — progress → frame (frames 110–146)
══════════════════════════════════════════════════ */
function ctxProgress() {
  const wrapTop  = ctxWrapper.offsetTop;
  const wrapH    = ctxWrapper.offsetHeight;
  const scrolled = window.scrollY - wrapTop;
  const maxScroll= wrapH - window.innerHeight;
  return Math.max(0, Math.min(1, scrolled / maxScroll));
}

function ctxProgressToFrame(p) {
  return Math.round(CTX_START + p * (CTX_END - CTX_START));
}

/* ══════════════════════════════════════════════════
   SCENE STATE — driven by HA progress
══════════════════════════════════════════════════ */
function updateHAScenes(p) {
  const frame = haProgressToFrame(p);

  // Progress within hero phase: 0→50% of total HA scroll
  const heroP   = Math.max(0, Math.min(1, p / 0.50));
  // Progress within about phase: 50→100%
  const aboutP  = Math.max(0, Math.min(1, (p - 0.50) / 0.50));

  /* ── Hero overlay: visible during first 55% ── */
  const heroVisible = p < 0.55;
  sceneHero.classList.toggle('active', heroVisible);

  /* ── Role cycling: depends on heroP ── */
  if (heroVisible) {
    const idx = Math.min(ROLES.length - 1, Math.floor(heroP * ROLES.length));
    if (idx !== currentRoleIdx) setRole(idx);
    scrollHint.style.opacity = String(Math.max(0, 1 - p * 4));
  }

  /* ── About overlay: visible during 45–100% ── */
  const aboutVisible = p > 0.45;
  sceneAbout.classList.toggle('active', aboutVisible);

  if (aboutVisible) {
    /* Big "Hi!" visible during 45–65% */
    const hiShow = p > 0.45 && p < 0.68;
    hiReveal.classList.toggle('show', hiShow);

    /* About panel: visible after 62% */
    aboutPanel.classList.toggle('show', p > 0.62);
  }

  /* ── Background mood shift ── */
  if (p < 0.5) {
    stageGrad.style.background = `radial-gradient(ellipse 80% 80% at 50% 110%, rgba(18,14,11,0) 0%, rgba(18,14,11,${0.35 + p * 0.3}) 100%)`;
    orbs[0].classList.remove('visible'); orbs[1].classList.remove('visible');
  } else {
    stageGrad.style.background = `radial-gradient(ellipse 80% 80% at 20% 50%, rgba(184,90,58,0.05) 0%, rgba(18,14,11,${0.5 + aboutP * 0.25}) 100%)`;
    orbs[0].classList.add('visible'); orbs[1].classList.add('visible');
  }

  /* ── Nav active link ── */
  $$('.nav-link, .mobile-menu-link').forEach(a => {
    const s = a.dataset.section;
    a.classList.toggle('active', (p < 0.5 && s === 'home') || (p >= 0.5 && s === 'about'));
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
  // Extra scroll height = track overflow
  const trackW   = projTrack.scrollWidth;
  const viewW    = window.innerWidth;
  const overflow = Math.max(0, trackW - viewW + 96); // +padding
  projSpacer.style.height = overflow + 'px';
}

function updateProjectsScroll() {
  if (IS_MOBILE()) { projTrack.style.transform = 'none'; return; }

  const sectionTop = projSection.offsetTop;
  const sectionH   = projSection.offsetHeight;
  const scrolled   = window.scrollY - sectionTop;
  const maxScroll  = sectionH - window.innerHeight;
  const p          = Math.max(0, Math.min(1, scrolled / maxScroll));

  const trackW     = projTrack.scrollWidth;
  const viewW      = window.innerWidth;
  const maxTx      = -(trackW - viewW + 96);
  projTrack.style.transform = `translateX(${p * maxTx}px)`;

  // Nav active
  if (p > 0) $$('.nav-link, .mobile-menu-link').forEach(a => a.classList.toggle('active', a.dataset.section === 'projects'));
}

/* ══════════════════════════════════════════════════
   SKILLS — intersection observer
══════════════════════════════════════════════════ */
function setupSkillsObserver() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  $$('.skill-group').forEach((el, i) => {
    el.style.transitionDelay = (i * 80) + 'ms';
    io.observe(el);
  });
}

/* ══════════════════════════════════════════════════
   CONTACT CANVAS
══════════════════════════════════════════════════ */
function updateContactCanvas() {
  const p = ctxProgress();
  ctxTargetFrame = ctxProgressToFrame(p);

  // Show overlay once progress starts
  ctxOverlay.classList.toggle('show', p > 0.15);
  if (p > 0.6) socialRow.classList.add('visible');

  // Nav active
  if (p > 0) $$('.nav-link, .mobile-menu-link').forEach(a => a.classList.toggle('active', a.dataset.section === 'contact'));
}

/* ══════════════════════════════════════════════════
   SCROLL HANDLER
══════════════════════════════════════════════════ */
function onScroll() {
  const sy  = window.scrollY;
  const max = document.body.scrollHeight - window.innerHeight;
  const gp  = sy / max; // global progress

  // Progress bar
  scrollPrg.style.width = (gp * 100) + '%';

  // Navbar
  navbar.classList.toggle('visible', sy > 30);

  // Determine which wrapper is in view
  const haBottom  = haWrapper.offsetTop + haWrapper.offsetHeight;
  const ctxTop    = ctxWrapper.offsetTop;

  if (sy < haBottom) {
    // In hero/about zone
    const p = haProgress();
    haTargetFrame = haProgressToFrame(p);
    updateHAScenes(p);
  } else if (sy >= ctxTop) {
    // In contact zone
    updateContactCanvas();
  } else {
    // Projects / Skills zone — both canvases frozen
    updateProjectsScroll();
    $$('.nav-link, .mobile-menu-link').forEach(a => {
      const inSkills = sy >= ($('skills')?.offsetTop || 0) - 200;
      a.classList.toggle('active',
        (inSkills && a.dataset.section === 'skills') ||
        (!inSkills && a.dataset.section === 'projects')
      );
    });
  }

  // Always update projects scroll
  updateProjectsScroll();
}

/* ══════════════════════════════════════════════════
   RAF RENDER LOOP — smooth lerp
══════════════════════════════════════════════════ */
function loop() {
  rafId = requestAnimationFrame(loop);

  // HA canvas
  haCurFrame += (haTargetFrame - haCurFrame) * 0.18;
  const haIdx = Math.max(HA_START, Math.min(HA_END, Math.round(haCurFrame)));
  const haImg = frames[haIdx];
  if (haImg && haImg.complete && haImg.naturalWidth) drawHAFrame(haImg);

  // Contact canvas
  ctxCurFrame += (ctxTargetFrame - ctxCurFrame) * 0.18;
  const ctxIdx = Math.max(CTX_START, Math.min(CTX_END, Math.round(ctxCurFrame)));
  const ctxImg = frames[ctxIdx];
  if (ctxImg && ctxImg.complete && ctxImg.naturalWidth) drawCtxFrame(ctxImg);
}

/* ══════════════════════════════════════════════════
   NAV SMOOTH SCROLL
══════════════════════════════════════════════════ */
function setupNav() {
  const targets = {
    home:     () => 0,
    about:    () => haWrapper.offsetTop + haWrapper.offsetHeight * 0.55,
    projects: () => projSection.offsetTop,
    skills:   () => ($('skills') || {}).offsetTop || 0,
    contact:  () => ctxWrapper.offsetTop,
  };

  $$('.nav-link, .btn-primary, .btn-ghost, .nav-cta').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const key = href.slice(1);
    if (!targets[key]) return;
    a.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: targets[key](), behavior: 'smooth' });
    });
  });
}

/* ══════════════════════════════════════════════════
   RESIZE HANDLER
══════════════════════════════════════════════════ */
function onResize() {
  const nowMobile = IS_MOBILE();
  resizeCanvases();
  setupProjectsSpacer();

  // If mobile/desktop state changed, reload frames from correct folder
  if (nowMobile !== isMobileNow) {
    isMobileNow = nowMobile;
    loadedCount = 0;
    frames = [];
    preloadAll(); // non-blocking, frames update as they load
  }
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
async function init() {
  resizeCanvases();

  // Setup hamburger first (no async dependency)
  setupHamburger();

  // Preload all frames
  await preloadAll();

  // Small settle delay
  await new Promise(r => setTimeout(r, 300));

  // Hide loader
  loader.classList.add('hidden');

  // Setup
  setupProjectsSpacer();
  setupSkillsObserver();
  setupNav();

  // Show first frame and initial scene
  const f1 = frames[1];
  if (f1 && f1.complete) drawHAFrame(f1);
  const fCtx = frames[CTX_START];
  if (fCtx && fCtx.complete) drawCtxFrame(fCtx);

  // Activate hero scene
  sceneHero.classList.add('active');
  roleWord.textContent = ROLES[0];

  // Navbar visible after brief delay
  setTimeout(() => navbar.classList.add('visible'), 600);

  // Listeners
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  // Start render loop
  loop();
}

window.addEventListener('DOMContentLoaded', init);