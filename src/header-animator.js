// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: © 2025 David Osipov <personal@david-osipov.vision>
// Author Website: https://david-osipov.vision
// Author ISNI: 0000 0005 1802 960X
// Author ISNI URL: https://isni.org/isni/000000051802960X
// Author ORCID: 0009-0005-2713-9242
// Author VIAF: 139173726847611590332
// Author Wikidata: Q130604188
// Version: 2.0.0

import { secureDevLog, environment } from "./security-kit.js";

/**
 * @typedef {Object} CapabilityResult
 * @property {boolean} webAnimations - Whether Web Animations API is supported
 * @property {boolean} viewTransitions - Whether View Transitions API is supported
 * @property {boolean} intersectionObserver - Whether Intersection Observer is supported
 * @property {boolean} reducedMotion - Whether user prefers reduced motion
 * @property {boolean} composite - Whether composite animations are supported
 * @property {'fallback'|'standard'|'enhanced'|'premium'} level - Capability level
 */

/**
 * @typedef {KeyframeAnimationOptions & {composite?: CompositeOperation}} ExtendedAnimationOptions
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} initStart - Initialization start time
 * @property {number} initComplete - Initialization complete time
 * @property {number} animationCount - Number of animations played
 * @property {number} errorCount - Number of errors encountered
 */

/**
 * Configuration for the Enhanced Header Animator.
 * Centralizes all configuration in a secure, immutable object.
 */
const CONFIG = Object.freeze({
  DEBUG: environment.isDevelopment,
  HEADER_ID: "main-header",
  ELEMENT_SELECTORS: Object.freeze({
    navbarContainer: "#navbar-container",
    headerLogo: "#header-logo",
    navbarMenu: "#navbar-menu",
    languageSwitcher: "#language-switcher",
  }),
  ANIMATION: Object.freeze({
    DURATION: 300,
    EASING: "cubic-bezier(0.4, 0.0, 0.2, 1)", // Material Design standard
    TIMING: "both", // fill property
  }),
  HOVER: Object.freeze({
    DURATION: 400,
    EASING: "cubic-bezier(0.19, 1, 0.22, 1)", // Ease Out Expo
  }),
  SENTINEL: Object.freeze({
    TOP_OFFSET: 50, // pixels
    CLASS_NAME: "header-scroll-sentinel",
  }),
  PERFORMANCE: Object.freeze({
    RAF_THROTTLE: true,
    DIRECTION_DEBOUNCE_MS: 100,
    MAX_ANIMATION_RETRIES: 3,
  }),
  SECURITY: Object.freeze({
    MAX_ELEMENTS: 10, // Prevent DOM pollution
    CSP_SAFE: true,
    VALIDATE_SELECTORS: true,
  }),
});

/**
 * Capability detector with enhanced security and error handling
 */
class CapabilityDetector {
  /** @type {CapabilityResult | null} */
  static #cache = null;

  // Expose cache for testing
  static get _cache() {
    return this.#cache;
  }
  /** @param {CapabilityResult | null} value */
  static set _cache(value) {
    this.#cache = value;
  }

  static detect() {
    if (this.#cache) return this.#cache;

    const capabilities = {
      webAnimations: this.#testWebAnimations(),
      viewTransitions: this.#testViewTransitions(),
      intersectionObserver: this.#testIntersectionObserver(),
      reducedMotion: this.#testReducedMotion(),
      composite: false,
      level: /** @type {'fallback'|'standard'|'enhanced'|'premium'} */ (
        "fallback"
      ),
    };

    // Test composite mode safely
    try {
      capabilities.composite = this.#testComposite();
    } catch (error) {
      secureDevLog("warn", "CapabilityDetector", "Composite detection failed", {
        error,
      });
    }

    // Determine capability level
    if (capabilities.viewTransitions && capabilities.webAnimations) {
      capabilities.level = "premium";
    } else if (capabilities.webAnimations && capabilities.composite) {
      capabilities.level = "enhanced";
    } else if (capabilities.webAnimations) {
      capabilities.level = "standard";
    }

    this.#cache = Object.freeze(capabilities);

    if (CONFIG.DEBUG) {
      secureDevLog(
        "info",
        "CapabilityDetector",
        "Capabilities detected",
        capabilities,
      );
    }

    return this.#cache;
  }

  static #testWebAnimations() {
    return (
      typeof Element !== "undefined" &&
      typeof Element.prototype.animate === "function"
    );
  }

  static #testViewTransitions() {
    return typeof document !== "undefined" && "startViewTransition" in document;
  }

  static #testIntersectionObserver() {
    return typeof IntersectionObserver !== "undefined";
  }

  static #testReducedMotion() {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  static #testComposite() {
    if (!this.#testWebAnimations()) return false;

    try {
      const testEl = document.createElement("div");
      testEl.style.cssText = "position:absolute;left:-9999px;opacity:0;";
      document.body.appendChild(testEl);

      const animation = testEl.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1,
        composite: "replace",
      });

      // Check for composite support with type assertion
      // prettier-ignore
      const hasComposite =
        animation &&
        (/** @type {any} */ (animation.effect)?.composite === "replace" ||
          "composite" in animation);

      animation.cancel();
      document.body.removeChild(testEl);

      return hasComposite;
    } catch {
      return false;
    }
  }
}

/**
 * Secure element validator and selector utility
 */
class ElementValidator {
  static #validatedElements = new WeakSet();

  /**
   * @param {string} selector
   * @returns {string}
   */
  static validateSelector(selector) {
    if (typeof selector !== "string" || !selector.trim()) {
      throw new Error("Invalid selector: must be a non-empty string");
    }

    // Secure CSS selector validation - allow only simple, safe selectors
    const allowedSelectors = [
      "#main-header",
      "#navbar-container",
      "#header-logo",
      "#navbar-menu",
      "#language-switcher",
    ];

    if (!allowedSelectors.includes(selector)) {
      throw new Error(`Selector not in allowlist: ${selector}`);
    }

    return selector;
  }

  /**
   * @param {unknown} element
   * @param {string | null} [expectedId]
   * @returns {Element}
   */
  static validateElement(element, expectedId = null) {
    if (!(element instanceof Element)) {
      throw new Error("Invalid element: must be a DOM Element");
    }

    if (expectedId && element.id !== expectedId) {
      throw new Error(
        `Element ID mismatch: expected ${expectedId}, got ${element.id}`,
      );
    }

    if (!this.#validatedElements.has(element)) {
      // Additional security checks
      if (element.tagName.toLowerCase() === "script") {
        throw new Error("Script elements are not allowed");
      }

      this.#validatedElements.add(element);
    }

    return element;
  }

  /**
   * @param {string} selector
   * @param {Document | Element} [context]
   * @returns {Element | null}
   */
  static queryElementSafely(selector, context = document) {
    this.validateSelector(selector);

    try {
      const element = context.querySelector(selector);
      return element ? this.validateElement(element) : null;
    } catch (error) {
      secureDevLog("error", "ElementValidator", "Query failed", {
        selector,
        error,
      });
      return null;
    }
  }
}

/**
 * Enhanced Header Animator with enterprise-grade security and performance
 */
class EnhancedHeaderAnimator {
  // Private fields for complete encapsulation
  /** @type {Element | null} */
  #header = null;
  /** @type {Map<string, Element>} */
  #elements = new Map();
  /** @type {Map<string, Animation>} */
  #animations = new Map();
  /** @type {HTMLDivElement | null} */
  #sentinelElement = null;
  /** @type {IntersectionObserver | null} */
  #observer = null;
  /** @type {AbortController | null} */
  #abortController = null;
  #isHovering = false;
  #isCompact = false;
  #isDestroyed = false;
  /** @type {CapabilityResult | null} */
  #capabilities = null;
  /** @type {PerformanceMetrics} */
  #performanceMetrics = {
    initStart: 0,
    initComplete: 0,
    animationCount: 0,
    errorCount: 0,
  };

  /**
   * @param {unknown} headerElement
   */
  constructor(headerElement) {
    this.#performanceMetrics.initStart = performance.now();

    try {
      this.#header = ElementValidator.validateElement(
        headerElement,
        CONFIG.HEADER_ID,
      );
      this.#abortController = new AbortController();
      this.#capabilities = CapabilityDetector.detect();

      if (CONFIG.DEBUG) {
        secureDevLog("info", "EnhancedHeaderAnimator", "Initializing", {
          capabilities: this.#capabilities,
        });
      }

      // Early exit for reduced motion
      if (this.#capabilities.reducedMotion) {
        this.#handleReducedMotion();
        return;
      }

      // Early exit if required APIs are missing
      if (!this.#checkPrerequisites()) {
        this.#handleFallback();
        return;
      }

      this.#initialize();

      this.#performanceMetrics.initComplete = performance.now();

      if (CONFIG.DEBUG) {
        const initTime =
          this.#performanceMetrics.initComplete -
          this.#performanceMetrics.initStart;
        secureDevLog(
          "info",
          "EnhancedHeaderAnimator",
          "Initialization complete",
          {
            initTime: `${initTime.toFixed(2)}ms`,
            level: this.#capabilities.level,
          },
        );
      }
    } catch (error) {
      this.#handleError("Initialization failed", error);
      // For error recovery, apply fallback
      this.#handleFallback();
    }
  }

  #handleReducedMotion() {
    if (!this.#header) return;
    this.#header.classList.add("reduced-motion");
    this.#header.setAttribute("data-animation-disabled", "reduced-motion");

    if (CONFIG.DEBUG) {
      secureDevLog("info", "EnhancedHeaderAnimator", "Reduced motion enabled");
    }
  }

  #handleFallback() {
    if (!this.#header) return;
    this.#header.classList.add("js-animation-fallback");
    this.#header.setAttribute("data-animation-disabled", "api-unavailable");

    if (CONFIG.DEBUG) {
      secureDevLog("warn", "EnhancedHeaderAnimator", "Using CSS fallback");
    }
  }

  #checkPrerequisites() {
    return (
      this.#capabilities?.webAnimations &&
      this.#capabilities?.intersectionObserver
    );
  }

  #initialize() {
    this.#setupElements();
    this.#setupViewTransitions();
    this.#createAnimations();
    this.#setupIntersectionObserver();
    this.#attachEventListeners();

    // Set initial state
    if (this.#header) {
      this.#header.setAttribute("data-animation-ready", "true");
    }
  }

  #setupElements() {
    if (!this.#header) return;

    const elementCount = Object.keys(CONFIG.ELEMENT_SELECTORS).length;

    if (elementCount > CONFIG.SECURITY.MAX_ELEMENTS) {
      throw new Error(
        `Too many elements: ${elementCount} > ${CONFIG.SECURITY.MAX_ELEMENTS}`,
      );
    }

    for (const [key, selector] of Object.entries(CONFIG.ELEMENT_SELECTORS)) {
      const element = ElementValidator.queryElementSafely(
        selector,
        this.#header,
      );

      if (element) {
        this.#elements.set(key, element);
        if (CONFIG.DEBUG) {
          secureDevLog(
            "debug",
            "EnhancedHeaderAnimator",
            `Element found: ${key}`,
          );
        }
      } else if (CONFIG.DEBUG) {
        secureDevLog(
          "warn",
          "EnhancedHeaderAnimator",
          `Element not found: ${key} (${selector})`,
        );
      }
    }
  }

  #setupViewTransitions() {
    if (this.#capabilities?.viewTransitions && this.#header) {
      /** @type {HTMLElement} */ (this.#header).style.viewTransitionName =
        "main-header";

      if (CONFIG.DEBUG) {
        secureDevLog(
          "info",
          "EnhancedHeaderAnimator",
          "View Transitions enabled",
        );
      }
    }
  }

  #createAnimations() {
    if (!this.#header || !this.#capabilities) return;

    /** @type {ExtendedAnimationOptions} */
    const baseOptions = {
      duration: CONFIG.ANIMATION.DURATION,
      fill: CONFIG.ANIMATION.TIMING,
      easing: CONFIG.ANIMATION.EASING,
    };

    // Add composite support if available
    if (this.#capabilities.composite) {
      baseOptions.composite = "replace";
    }

    try {
      // Header background animation
      const headerKeyframes = [
        {
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(4px)",
          boxShadow: "none",
          transform: "translateZ(0)", // Force compositing layer
        },
        {
          backgroundColor: "rgba(238, 229, 233, 0.4)",
          backdropFilter: "blur(12px)",
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          transform: "translateZ(0)",
        },
      ];

      const headerAnimation = this.#header.animate(
        headerKeyframes,
        baseOptions,
      );
      headerAnimation.pause();
      this.#animations.set("header", headerAnimation);

      // Element-specific animations
      this.#createElementAnimations(baseOptions);

      if (CONFIG.DEBUG) {
        secureDevLog("info", "EnhancedHeaderAnimator", "Animations created", {
          count: this.#animations.size,
          composite: this.#capabilities.composite,
        });
      }
    } catch (error) {
      // Trigger fallback mode
      this.#handleFallback();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Animation creation failed: ${errorMessage}`);
    }
  }

  /**
   * @param {ExtendedAnimationOptions} baseOptions
   */
  #createElementAnimations(baseOptions) {
    const animationConfigs = [
      {
        key: "navbarContainer",
        keyframes: [
          {
            paddingTop: "1rem",
            paddingBottom: "1rem",
            transform: "translateZ(0)",
          },
          {
            paddingTop: "0.25rem",
            paddingBottom: "0.25rem",
            transform: "translateZ(0)",
          },
        ],
      },
      {
        key: "headerLogo",
        keyframes: [
          { transform: "scale3d(1, 1, 1) translateZ(0)" },
          { transform: "scale3d(0.85, 0.85, 1) translateZ(0)" },
        ],
      },
      {
        key: "navbarMenu",
        keyframes: [
          { transform: "scale3d(1, 1, 1) translateZ(0)" },
          { transform: "scale3d(0.9, 0.9, 1) translateZ(0)" },
        ],
      },
      {
        key: "languageSwitcher",
        keyframes: [
          { transform: "scale3d(1, 1, 1) translateZ(0)" },
          { transform: "scale3d(0.9, 0.9, 1) translateZ(0)" },
        ],
      },
    ];

    for (const { key, keyframes } of animationConfigs) {
      const element = this.#elements.get(key);
      if (element) {
        try {
          const animation = element.animate(keyframes, baseOptions);
          animation.pause();
          this.#animations.set(key, animation);
        } catch (error) {
          secureDevLog(
            "error",
            "EnhancedHeaderAnimator",
            `Failed to create animation for ${key}`,
            { error },
          );
        }
      }
    }
  }

  #setupIntersectionObserver() {
    // Create sentinel element with security measures
    this.#sentinelElement = document.createElement("div");
    this.#sentinelElement.className = CONFIG.SENTINEL.CLASS_NAME;
    this.#sentinelElement.setAttribute("aria-hidden", "true");
    this.#sentinelElement.style.cssText = `
      position: absolute;
      top: ${CONFIG.SENTINEL.TOP_OFFSET}px;
      height: 1px;
      width: 1px;
      pointer-events: none;
      visibility: hidden;
      z-index: -1;
    `;

    // Use secure insertion method
    document.body.insertBefore(this.#sentinelElement, document.body.firstChild);

    /**
     * @param {IntersectionObserverEntry[]} entries
     */
    const observerCallback = (entries) => {
      if (this.#isDestroyed) return;

      try {
        for (const entry of entries) {
          const wasCompact = this.#isCompact;
          this.#isCompact = !entry.isIntersecting;

          if (wasCompact !== this.#isCompact) {
            this.#updateAnimationState();
          }
        }
      } catch (error) {
        this.#handleError("Observer callback failed", error);
      }
    };

    this.#observer = new IntersectionObserver(observerCallback, {
      threshold: 0,
      rootMargin: "0px",
    });

    this.#observer.observe(this.#sentinelElement);
  }

  #attachEventListeners() {
    if (!this.#abortController || !this.#header) return;

    const { signal } = this.#abortController;

    this.#header.addEventListener(
      "mouseenter",
      this.#handleMouseEnter.bind(this),
      {
        signal,
        passive: true,
      },
    );

    this.#header.addEventListener(
      "mouseleave",
      this.#handleMouseLeave.bind(this),
      {
        signal,
        passive: true,
      },
    );

    // Error handling for visibility changes
    document.addEventListener(
      "visibilitychange",
      this.#handleVisibilityChange.bind(this),
      {
        signal,
        passive: true,
      },
    );
  }

  #updateAnimationState() {
    if (this.#isHovering || this.#isDestroyed) return;

    const direction = this.#isCompact ? 1 : -1;
    let animationsUpdated = 0;

    try {
      for (const animation of this.#animations.values()) {
        if (animation && animation.playbackRate !== direction) {
          animation.playbackRate = direction;
          animation.play();
          animationsUpdated++;
        }
      }

      this.#performanceMetrics.animationCount += animationsUpdated;

      if (CONFIG.DEBUG && animationsUpdated > 0) {
        secureDevLog(
          "debug",
          "EnhancedHeaderAnimator",
          "Animation state updated",
          {
            direction: direction > 0 ? "compact" : "expand",
            count: animationsUpdated,
          },
        );
      }
    } catch (error) {
      this.#handleError("Animation state update failed", error);
    }
  }

  #handleMouseEnter() {
    if (this.#isDestroyed) return;

    this.#isHovering = true;

    try {
      for (const animation of this.#animations.values()) {
        if (animation) {
          animation.reverse();
        }
      }

      if (CONFIG.DEBUG) {
        secureDevLog("debug", "EnhancedHeaderAnimator", "Hover enter");
      }
    } catch (error) {
      this.#handleError("Mouse enter handler failed", error);
    }
  }

  #handleMouseLeave() {
    if (this.#isDestroyed) return;

    this.#isHovering = false;

    // Small delay to prevent rapid state changes
    setTimeout(() => {
      if (!this.#isHovering && !this.#isDestroyed) {
        this.#updateAnimationState();
      }
    }, 50);

    if (CONFIG.DEBUG) {
      secureDevLog("debug", "EnhancedHeaderAnimator", "Hover leave");
    }
  }

  #handleVisibilityChange() {
    if (document.hidden && !this.#isDestroyed) {
      // Pause animations when tab is hidden to save resources
      for (const animation of this.#animations.values()) {
        if (animation && animation.playState === "running") {
          animation.pause();
        }
      }
    }
  }

  /**
   * @param {string} message
   * @param {unknown} error
   */
  #handleError(message, error) {
    this.#performanceMetrics.errorCount++;

    secureDevLog("error", "EnhancedHeaderAnimator", message, {
      error: error instanceof Error ? error.message : String(error),
      stack: CONFIG.DEBUG && error instanceof Error ? error.stack : undefined,
    });

    // Prevent error cascade
    if (
      this.#performanceMetrics.errorCount >
      CONFIG.PERFORMANCE.MAX_ANIMATION_RETRIES
    ) {
      this.destroy();
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.#performanceMetrics,
      initDuration:
        this.#performanceMetrics.initComplete -
        this.#performanceMetrics.initStart,
      animationsActive: this.#animations.size,
      elementsTracked: this.#elements.size,
      capabilities: this.#capabilities?.level ?? "unknown",
    };
  }

  /**
   * Destroys the animator and cleans up all resources
   */
  destroy() {
    if (this.#isDestroyed) return;

    try {
      this.#isDestroyed = true;

      // Cancel all animations
      for (const animation of this.#animations.values()) {
        animation?.cancel();
      }
      this.#animations.clear();

      // Disconnect observer
      this.#observer?.disconnect();

      // Remove sentinel element
      this.#sentinelElement?.remove();

      // Abort all event listeners
      this.#abortController?.abort();

      // Clear references
      this.#elements.clear();
      this.#header = null;
      this.#sentinelElement = null;
      this.#observer = null;

      if (CONFIG.DEBUG) {
        secureDevLog(
          "info",
          "EnhancedHeaderAnimator",
          "Destroyed successfully",
          this.getMetrics(),
        );
      }
    } catch (error) {
      secureDevLog("error", "EnhancedHeaderAnimator", "Destruction failed", {
        error,
      });
    }
  }
}

// --- Initialization Manager ---
class HeaderAnimationManager {
  /** @type {EnhancedHeaderAnimator | null} */
  static #instance = null;
  /** @type {WeakMap<Element, EnhancedHeaderAnimator>} */
  static #instances = new WeakMap();

  static initialize() {
    try {
      const header = ElementValidator.queryElementSafely(
        `#${CONFIG.HEADER_ID}`,
      );

      if (!header) {
        if (CONFIG.DEBUG) {
          secureDevLog(
            "warn",
            "HeaderAnimationManager",
            `Header not found: #${CONFIG.HEADER_ID}`,
          );
        }
        this.#instance = null;
        return;
      }

      // Clean up existing instance
      if (this.#instances.has(header)) {
        this.#instances.get(header)?.destroy();
      }

      // Create new instance
      const animator = new EnhancedHeaderAnimator(header);
      this.#instances.set(header, animator);
      this.#instance = animator;

      if (CONFIG.DEBUG) {
        secureDevLog(
          "info",
          "HeaderAnimationManager",
          "Initialization successful",
        );
      }
    } catch (error) {
      secureDevLog("error", "HeaderAnimationManager", "Initialization failed", {
        error,
      });
      this.#instance = null;

      // Apply fallback class for CSS-only animations
      const header = document.getElementById(CONFIG.HEADER_ID);
      if (header) {
        header.classList.add("js-animation-failed");
        header.setAttribute("data-animation-disabled", "error");
      }
    }
  }

  static destroy() {
    if (this.#instance) {
      this.#instance.destroy();
      this.#instance = null;
    }
  }

  static getInstance() {
    return this.#instance;
  }
}

// --- Secure Initialization ---
function safeInitialize() {
  // Prevent multiple initializations
  if (HeaderAnimationManager.getInstance()) {
    HeaderAnimationManager.destroy();
  }

  HeaderAnimationManager.initialize();
}

// CSP-safe event listeners
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInitialize, {
      once: true,
    });
  } else {
    // DOM is already ready
    safeInitialize();
  }

  // Support for SPA navigation (Astro)
  document.addEventListener("astro:page-load", safeInitialize);

  // Cleanup on page unload
  window.addEventListener(
    "beforeunload",
    () => {
      HeaderAnimationManager.destroy();
    },
    { once: true },
  );
}

// Export for testing and manual control
export {
  EnhancedHeaderAnimator,
  HeaderAnimationManager,
  CapabilityDetector,
  ElementValidator,
};
export default HeaderAnimationManager;
