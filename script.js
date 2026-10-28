/**
 * A LITTLE SOMETHING FOR YOU — INTERACTION & ANIMATION CONTROLLER
 * Single authoritative state machine for the physical card fold and scroll reveals.
 */
(function () {
  'use strict';

  // Mark document as JS-enabled for progressive enhancement
  document.documentElement.classList.add('js-enabled');

  const CARD_STATE = {
    CLOSED: 'closed',
    OPENING: 'opening',
    OPEN: 'open'
  };

  let currentState = CARD_STATE.CLOSED;
  let openTimeline = null;
  const activeObservers = [];

  // DOM Elements
  const cardElement = document.getElementById('greeting-card');
  const cardViewport = document.querySelector('.card-viewport');
  const coverHinge = document.getElementById('card-cover-hinge');
  const openButton = document.getElementById('open-card-button');
  const cardInterior = document.getElementById('card-interior');
  const interiorGreeting = document.getElementById('interior-greeting');
  const keepsakeFlow = document.getElementById('KeepsakeContent');
  const driftLeaves = document.querySelectorAll('.drift-leaf');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';

  /**
   * Gracefully handle missing local photographs without breaking layout
   */
  function initImageFallbacks() {
    const photos = document.querySelectorAll('.family-photo');
    photos.forEach((img) => {
      const handleError = () => {
        img.style.display = 'none';
      };
      img.addEventListener('error', handleError, { once: true });
      if (img.complete && img.naturalWidth === 0) {
        handleError();
      }
    });
  }

  /**
   * Unlocks the below-the-fold keepsake sections and sets up one-time scroll reveals
   */
  function unlockKeepsakeSections() {
    if (!keepsakeFlow) return;

    keepsakeFlow.classList.add('is-unfolded');
    keepsakeFlow.setAttribute('aria-hidden', 'false');

    const photoOne = document.getElementById('photo-frame-one');
    const photoTwo = document.getElementById('photo-frame-two');
    const daughterSheet = document.querySelector('#scene-daughter-letter .stationery-sheet');
    const boyfriendSheet = document.querySelector('#scene-boyfriend-letter .stationery-sheet');
    const closingCard = document.querySelector('#scene-closing .closing-card');

    // If reduced motion is requested or GSAP is unavailable, reveal everything immediately
    if (prefersReducedMotion || !hasGSAP || !('IntersectionObserver' in window)) {
      [photoOne, photoTwo, daughterSheet, boyfriendSheet, closingCard].forEach((el) => {
        if (el) {
          el.style.opacity = '1';
          el.style.transform = '';
        }
      });
      return;
    }

    // Set initial subtle vertical offset for photos while preserving their 1-2deg frame tilt
    gsap.set(photoOne, { opacity: 0, y: 16, rotation: -1.15 });
    gsap.set(photoTwo, { opacity: 0, y: 16, rotation: 1.35 });
    gsap.set([daughterSheet, boyfriendSheet, closingCard], { opacity: 0, y: 16 });

    // Scene 3: Photographs arrival (first photo, followed shortly by second)
    const photoSpread = document.getElementById('scene-photos');
    if (photoSpread) {
      createOneTimeObserver(photoSpread, 0.18, () => {
        const tl = gsap.timeline();
        tl.to(photoOne, {
          opacity: 1,
          y: 0,
          duration: 0.54,
          ease: 'power2.out'
        }).to(
          photoTwo,
          {
            opacity: 1,
            y: 0,
            duration: 0.54,
            ease: 'power2.out'
          },
          '-=0.28'
        );
      });
    }

    // Scene 4: Daughter's letter reveal (350ms to 500ms)
    if (daughterSheet) {
      createOneTimeObserver(daughterSheet, 0.15, () => {
        gsap.to(daughterSheet, {
          opacity: 1,
          y: 0,
          duration: 0.44,
          ease: 'power2.out'
        });
      });
    }

    // Scene 5: Boyfriend's letter reveal (350ms to 500ms)
    if (boyfriendSheet) {
      createOneTimeObserver(boyfriendSheet, 0.15, () => {
        gsap.to(boyfriendSheet, {
          opacity: 1,
          y: 0,
          duration: 0.44,
          ease: 'power2.out'
        });
      });
    }

    // Scene 6: Final birthday wish reveal (500ms to 700ms)
    if (closingCard) {
      createOneTimeObserver(closingCard, 0.2, () => {
        gsap.to(closingCard, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out'
        });
      });
    }
  }

  /**
   * Helper: Observes an element once, triggers callback on entry, and disconnects
   */
  function createOneTimeObserver(targetElement, threshold, onEnter) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onEnter();
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
         rootMargin: '0px 0px -6% 0px',
        threshold: threshold
      }
    );

    observer.observe(targetElement);
    activeObservers.push(observer);
  }

  /**
   * Finalizes the open state and updates accessibility attributes
   */
  function completeCardOpen() {
    currentState = CARD_STATE.OPEN;
    if (cardElement) {
      cardElement.setAttribute('data-state', CARD_STATE.OPEN);
    }
    if (openButton) {
      openButton.setAttribute('aria-expanded', 'true');
      openButton.setAttribute('tabindex', '-1');
      openButton.style.pointerEvents = 'none';
    }
    if (cardInterior) {
      cardInterior.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Runs the physical card opening sequence once
   */
  function handleOpenCard() {
    // Prevent duplicate triggers or re-opening
    if (currentState !== CARD_STATE.CLOSED) {
      return;
    }

    currentState = CARD_STATE.OPENING;
    cardElement.setAttribute('data-state', CARD_STATE.OPENING);

    if (cardViewport) {
      cardViewport.classList.add('is-open-spread');
    }

    // Unlock the scrollable keepsake spread underneath
    unlockKeepsakeSections();

    // 1. Reduced Motion Path: Instant, calm reveal without 3D swing or falling leaves
    if (prefersReducedMotion) {
      if (coverHinge) {
        coverHinge.style.display = 'none';
      }
      if (interiorGreeting) {
        interiorGreeting.style.opacity = '1';
        interiorGreeting.style.transform = 'none';
      }
      completeCardOpen();
      return;
    }

    // 2. CSS Fallback Path (if GSAP failed to load from CDN)
    if (!hasGSAP) {
      cardElement.classList.add('css-fallback-open');
      window.setTimeout(completeCardOpen, 1100);
      return;
    }

    // 3. Coordinated GSAP Timeline Path
    const isDesktop = window.innerWidth >= 768;
    const targetRotationY = isDesktop ? -162 : -146;

    openTimeline = gsap.timeline({
      onComplete: () => {
        completeCardOpen();
        openTimeline = null;
      }
    });

    // Step A: Physical cover rotation around left vertical hinge (900 to 1,200 ms)
    openTimeline.to(
      coverHinge,
      {
        rotationY: targetRotationY,
        duration: 1.08,
        ease: 'power2.inOut'
      },
      0
    );

    // Step B: Interior birthday greeting reveal once panel is sufficiently visible (450 to 650 ms)
    openTimeline.to(
      interiorGreeting,
      {
        opacity: 1,
        y: 0,
        duration: 0.56,
        ease: 'power2.out'
      },
      0.42
    );

    // Step C: Restrained, non-repeating drift of 4 illustrated leaves (2 to 4 seconds)
    const leafConfigs = [
      { y: 240, x: 14, rotation: 38, duration: 2.6, delay: 0.48 },
      { y: 270, x: -16, rotation: -44, duration: 3.1, delay: 0.62 },
      { y: 310, x: 18, rotation: 52, duration: 3.4, delay: 0.78 },
      { y: 255, x: -12, rotation: -32, duration: 2.8, delay: 0.55 }
    ];

    driftLeaves.forEach((leaf, index) => {
      const cfg = leafConfigs[index] || leafConfigs[0];
      gsap.fromTo(
        leaf,
        {
          opacity: 0,
          y: -20,
          x: 0,
          rotation: 0
        },
        {
          opacity: 0.75,
          y: cfg.y,
          x: cfg.x,
          rotation: cfg.rotation,
          duration: cfg.duration,
          delay: cfg.delay,
          ease: 'sine.out',
          onComplete: () => {
            gsap.to(leaf, { opacity: 0, duration: 0.45, ease: 'power1.out' });
          }
        }
      );
    });
  }

  /**
   * Initialize Event Listeners
   */
  function init() {
    initImageFallbacks();

    if (!openButton) return;

    openButton.addEventListener('click', handleOpenCard, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();