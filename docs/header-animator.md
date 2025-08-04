# Header Animator

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html)
[![Built with](https://img.shields.io/badge/Built%20with-Modern%20JS-F7DF1E?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Security](https://img.shields.io/badge/Security-Hardened-brightgreen)](https://owasp.org/www-project-top-ten/)


*   **SPDX-License-Identifier:** MIT  
*   **SPDX-FileCopyrightText:** © 2025 David Osipov <personal@david-osipov.vision>
*   **Author Website:** [david-osipov.vision](https://david-osipov.vision)
*   **Author ISNI:** 0000 0005 1802 960X
*   **ORCID:** [0009-0005-2713-9242](https://orcid.org/0009-0005-2713-9242)
*   **VIAF:** [139173726847611590332](https://viaf.org/viaf/139173726847611590332/)
*   **Wikidata:** [Q130604188](https://www.wikidata.org/wiki/Q130604188)

---

## Vision: Beyond Animation

This is not just another scroll-triggered header animation script. It is an **enterprise-grade, secure, and resilient animation system** designed for the modern web. It provides a smooth, performant header transition effect while adhering to the strictest principles of security, performance, and accessibility.

This module was architected with a "security-first" and "performance-by-default" mindset, ensuring a high-quality user experience without compromising on application stability or safety.

### Core Philosophy

The animator is built on four foundational pillars:

*   🛡️ **Security & Resilience:** The system is defensively coded to prevent common web vulnerabilities, handle errors gracefully, and operate within a strict security policy. It is designed to be resilient to unexpected states or browser bugs.
*   ⚡ **Performance by Default:** It leverages the most efficient, modern browser APIs to ensure animations are silky-smooth and run off the main thread where possible. It avoids legacy, performance-killing techniques like `onscroll` event listeners.
*   🦾 **Progressive Enhancement:** The system intelligently detects browser capabilities and delivers the best possible experience. Users with modern browsers get premium animations, while users on older browsers or with accessibility needs receive a seamless, appropriate fallback. The script never breaks the page.
*   🏗️ **Architectural Integrity:** With a clean separation of concerns, true encapsulation using private fields, and a robust lifecycle management system, the code is highly maintainable, testable, and suitable for complex Single-Page Applications (SPAs).

---

## Why Use This Animator? (A Deep Dive into its Quality)

This script's quality is evident in its architecture, security posture, and performance-oriented design. It makes the "right way" the "easy way."

### 1. Architectural Excellence

The script is a model of modern software design, promoting maintainability and stability.

*   **Separation of Concerns:** The code is cleanly divided into four classes, each with a single responsibility:
    *   `CapabilityDetector`: Determines what the browser can handle.
    *   `ElementValidator`: A security-focused utility to safely query and validate DOM elements.
    *   `EnhancedHeaderAnimator`: The core logic engine that orchestrates the animations.
    *   `HeaderAnimationManager`: A singleton that controls the animator's lifecycle.
*   **Immutable Configuration:** The `CONFIG` object is recursively frozen with `Object.freeze()`. This critical step ensures that configuration cannot be altered at runtime, preventing a whole class of potential bugs and security vulnerabilities.
*   **Robust Lifecycle Management:** The `HeaderAnimationManager` provides `initialize()` and `destroy()` methods. Proper cleanup of event listeners, animations, and observers is essential for preventing memory leaks in SPAs (e.g., with frameworks like Astro, Next.js, or SvelteKit), and this script handles it perfectly.

### 2. A Security-First Mindset

Security is woven into the fabric of the animator, not bolted on as an afterthought.

*   **Selector Allowlisting:** The `ElementValidator` does not query arbitrary selectors. It validates them against a **strict allowlist**, mitigating the risk of unexpected behavior or security issues if the DOM is manipulated.
    ```javascript
    // A hardcoded allowlist prevents the script from interacting
    // with unintended or potentially malicious elements.
    const allowedSelectors = [
      '#main-header',
      '#navbar-container',
      // ...
    ];
    if (!allowedSelectors.includes(selector)) {
      throw new Error(`Selector not in allowlist: ${selector}`);
    }
    ```
*   **DOM Pollution Prevention:** The script enforces a maximum number of elements it will interact with (`CONFIG.SECURITY.MAX_ELEMENTS`), preventing performance degradation or unexpected behavior from DOM injection attacks.
*   **Error Resilience & Graceful Degradation:** The animator is wrapped in extensive `try...catch` blocks and includes a retry limit for errors. If something goes wrong, it will gracefully fall back to a CSS-only state or destroy itself rather than crashing the page.

### 3. Performance by Default

The script is meticulously optimized for a smooth user experience.

*   **Modern API Usage:**
    *   It uses the **Web Animations API** (`element.animate`), which allows browsers to run animations on the high-priority compositor thread, making them immune to main-thread JavaScript jank.
    *   It uses **`IntersectionObserver`** to detect scroll position. This is vastly more performant than attaching a listener to the `scroll` event, which can fire hundreds of times per second and cause major performance bottlenecks.
*   **Resource Conservation:**
    *   Animations are automatically paused via the `visibilitychange` event when the tab is hidden, saving CPU cycles and battery life.
    *   Event listeners are registered with `{ passive: true }` to optimize scrolling performance.

---

## Usage

### 1. HTML Structure

Ensure your HTML has the element IDs that the animator expects. These are defined in the internal `CONFIG` object.

```html
<header id="main-header">
  <div id="navbar-container">
    <div id="header-logo">...</div>
    <nav id="navbar-menu">...</nav>
    <div id="language-switcher">...</div>
  </div>
</header>
```

### 2. JavaScript Initialization

Simply import and initialize the manager. The script will handle the rest.

```javascript
import HeaderAnimationManager from 'enhanced-header-animator';

// Initialize the animator when the DOM is ready.
// The manager handles all setup and capability detection internally.
HeaderAnimationManager.initialize();
```

The script automatically listens for `DOMContentLoaded` and `astro:page-load` (for Astro integration), so you can place this in your main script file.

### Advanced API

While the default `initialize()` is sufficient for most cases, you can interact with the system directly.

```javascript
import { HeaderAnimationManager, EnhancedHeaderAnimator } from 'enhanced-header-animator';

// Get the active animator instance
const animatorInstance = HeaderAnimationManager.getInstance();

if (animatorInstance) {
  // Get performance metrics
  console.log(animatorInstance.getMetrics());

  // Manually destroy the animator to clean up all resources
  // Useful in complex SPA navigation scenarios.
  HeaderAnimationManager.destroy();
}
```

---

## Graceful Degradation & Fallbacks

The system is designed to provide a seamless experience for all users.

1.  **Reduced Motion:** If a user has `(prefers-reduced-motion: reduce)` enabled in their OS, the script will detect this, cancel all animations, and add a `.reduced-motion` class to the header. This allows you to provide a simple, accessible fade or no transition at all via CSS.
2.  **Missing APIs:** If a critical API like `Web Animations` or `IntersectionObserver` is missing, the script will add a `.js-animation-fallback` class to the header, allowing you to define simpler CSS transitions as a fallback.
3.  **Runtime Errors:** If the script fails during initialization for any reason, it will add a `.js-animation-failed` class to the header and clean up after itself, ensuring the page remains functional.

## Environment Support

This module relies on modern browser APIs. It is designed for:
*   **Chrome** 61+
*   **Firefox** 72+
*   **Safari** 12.1+
*   **Edge** 79+

The script requires **`IntersectionObserver`** and the **`Web Animations API`** to function. It will gracefully fall back on browsers where these are not supported.

## Author and License

*   **Author:** David Osipov
*   **ISNI:** 0000 0005 1802 960X ([International Standard Name Identifier](https://isni.org/isni/000000051802960X))
*   **Contact:** <personal@david-osipov.vision>
*   **License:** MIT License.
