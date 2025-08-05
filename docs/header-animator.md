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

## Advanced Features & Design Philosophy

This script's quality is evident in its architecture and the deliberate engineering decisions made to ensure stability, security, and performance.

### 1. Intelligent Feature Detection (Not Browser Sniffing)

This script adheres to the modern best practice of **feature detection** over the outdated and unreliable method of browser sniffing. It never asks "What browser is this?" but instead asks "What can this browser *do*?". The `CapabilityDetector` class checks for the presence of specific, high-performance APIs and assigns a capability level to tailor the user experience.

| Capability Level | Required APIs                                    | User Experience                                                                      |
| :--------------- | :----------------------------------------------- | :----------------------------------------------------------------------------------- |
| **Premium**      | `View Transitions` + `Web Animations`            | The smoothest scroll animations plus seamless, hardware-accelerated page transitions.  |
| **Enhanced**     | `Web Animations` + `Composite`                   | Silky-smooth scroll animations with optimal performance via composite mode.            |
| **Standard**     | `Web Animations`                                 | Smooth scroll animations that run off the main thread.                               |
| **Fallback**     | None of the above                                | No JavaScript animations. The script applies a CSS class for a simple, clean fallback. |

This approach ensures the script is future-proof, reliable, and always delivers the best possible experience for each user's environment.

### 2. Uncompromising Performance

*   **True Jank-Free Animation with WAAPI:** The script exclusively uses the Web Animations API (`element.animate`). This is a critical architectural choice because WAAPI allows the browser to run animations primarily on the **compositor thread**, separate from the main thread where JavaScript execution occurs. The result is animations that remain silky-smooth even when the main thread is busy.

*   **Efficient Scroll Detection with `IntersectionObserver`:** Instead of relying on the legacy `onscroll` event listener—a notorious source of performance issues—the animator uses a modern **`IntersectionObserver`**. A lightweight "sentinel" element is observed, and the browser efficiently notifies the script *only when the header's state needs to change*. This asynchronous approach consumes virtually zero resources while idle.

*   **Stateful, Controllable Animations:** Animations are created *once* during initialization and held in a paused state. To change direction, the script simply flips the `animation.playbackRate` between `1` and `-1`. This is vastly more performant than creating new animations or toggling CSS classes, as it avoids the overhead of object creation and style recalculations.

*   **Explicit Compositor-Layer Promotion:** Keyframes include `transform: 'translateZ(0)'` to hint to the browser that animated elements should be promoted to their own **compositing layer** on the GPU, ensuring they are animated independently of the page's main paint lifecycle.

### 3. A Security-First Mindset

*   **Mitigation of Selector Injection via Allowlisting:** The `ElementValidator` validates all CSS selectors against a hardcoded allowlist. This crucial security measure prevents **Selector Injection**, where a vulnerability elsewhere on the page (like XSS) could otherwise trick the script into manipulating unintended elements.

*   **Protection Against DOM Clobbering & Pollution:** By validating that queried nodes are true `Element` instances and limiting the number of tracked elements (`MAX_ELEMENTS`), the script is hardened against DOM Clobbering and performance degradation from DOM injection attacks.

*   **Automatic Circuit Breaker:** The script counts runtime errors. If the number of errors exceeds a configured maximum, it automatically destroys itself. This **resilience pattern** prevents a persistent issue from causing an endless loop of errors that could crash the browser tab.

### 4. Architectural Excellence

*   **True Encapsulation with Private Fields (`#`):** The core animator class uses ECMAScript private fields (e.g., `#header`, `#animations`). This provides **guaranteed privacy**, preventing any external script from interfering with the animator's internal state, leading to a more robust and stable system.

*   **Immutable, Centralized Configuration:** The `CONFIG` object is recursively frozen with `Object.freeze()`. This prevents accidental or malicious runtime modification of critical parameters, making the script more predictable and secure.

*   **Robust Lifecycle with `AbortController`:** To prevent memory leaks in SPAs, all event listeners are managed via an `AbortController`. The `destroy()` method makes a single, foolproof call to `.abort()`, ensuring all listeners are instantly and reliably cleaned up.

---

### Execution Flow

The animator follows a clear, robust lifecycle from initialization to cleanup:

1.  **Initialize (`HeaderAnimationManager.initialize()`):** The manager is invoked, typically on `DOMContentLoaded` or a SPA navigation event.
2.  **Detect Capabilities:** `CapabilityDetector` runs once and caches its results, assigning a capability level.
3.  **Validate & Query:** `ElementValidator` safely finds the required DOM elements against its internal allowlist. If validation fails, the script gracefully aborts.
4.  **Create Animations:** `EnhancedHeaderAnimator` creates all necessary `Animation` objects via WAAPI but leaves them **paused** at time `0`.
5.  **Observe:** An `IntersectionObserver` is attached to a sentinel element.
6.  **Trigger & Animate:** When the sentinel's intersection status changes, the observer callback fires. The script updates the `playbackRate` of the pre-built animations to `1` (to shrink) or `-1` (to expand) and calls `.play()`.
7.  **Cleanup (`destroy()`):** On page unload or manual call, all animations are cancelled, the observer is disconnected, and all event listeners are removed to prevent memory leaks.

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

The system is designed to provide a seamless experience for all users, automatically adapting to their environment.

| Condition                                            | Action Taken by Script                       | CSS Class Added             | Developer Action                                         |
| :--------------------------------------------------- | :------------------------------------------- | :-------------------------- | :------------------------------------------------------- |
| User has `prefers-reduced-motion`                    | All JS animations are disabled.              | `.reduced-motion`           | Use CSS to define a simple fade or no transition.        |
| `Web Animations API` or `IntersectionObserver` is missing | Script gracefully aborts initialization.     | `.js-animation-fallback`    | Use CSS transitions to define a simpler animation.       |
| A runtime error occurs during setup                  | Script aborts and cleans up all resources.   | `.js-animation-failed`      | Use CSS to ensure the header has a safe, static style.   |

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
