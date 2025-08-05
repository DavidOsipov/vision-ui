# GitHub Copilot Instructions for the Vision UI Repository

## 1. Project Overview & Philosophy

This project, Vision UI, is a collection of enterprise-grade, dependency-free JavaScript modules for modern web projects. It is architected and directed by David Osipov, a Lead Product Manager, in collaboration with a "committee" of specialized AI models.

**Core Philosophy:** The project is built on a foundation of uncompromising security, exceptional performance, robust accessibility, and modern architectural integrity. Your primary directive is to generate code and provide reviews that strictly adhere to these principles.

**Key Goals:**

- Produce high-quality, dependency-free UI components and core utilities.
- Ensure every module is secure, performant, and resilient by default.
- Leverage modern browser APIs and gracefully degrade for older environments.
- Maintain clean, maintainable, and well-documented code suitable for enterprise applications and SPAs.

## 2. Folder Structure

- `/src`: Contains the source code for all JavaScript modules (e.g., `header-animator.js`, `security-kit.js`).
- `/docs`: Contains detailed markdown documentation for each module.
- `CONTRIBUTING.md`: Guidelines for contributors.
- `SECURITY.md`: The project's security policy.
- `README.md`: High-level overview of the project.
- `LICENSE.md`: The MIT License file.

When generating code or documentation, respect this structure. New modules should have their source in `/src` and documentation in `/docs`.

## 3. Libraries, Frameworks, and Environment

- **No External Dependencies:** This is a zero-dependency project. Do not suggest or import any third-party libraries or npm packages.
- **Environment:** The code is written in modern, vanilla JavaScript (ESM). It targets modern browsers (Chrome, Firefox, Safari, Edge) that support the Web Crypto API, IntersectionObserver, and the Web Animations API (WAAPI).
- **Tooling:** The project is framework-agnostic, designed to be dropped into any modern stack like Astro, Eleventy, or vanilla HTML.

## 4. Coding Standards and Conventions

### 4.1. General Style

- Use modern JavaScript features: `class`, private fields (`#`), `const`/`let`, arrow functions, and `async/await`.
- Code must be clean, readable, and self-documenting where possible.
- Adhere strictly to the **DRY (Don't Repeat Yourself)** principle. Centralize and reuse logic where appropriate.
- All files must begin with the SPDX license and copyright header, crediting "David Osipov <personal@david-osipov.vision>".

### 4.2. Formatting & Comments

- Use semicolons at the end of each statement.
- Use single quotes for strings.
- Provide comprehensive JSDoc comments for all public functions, classes, and modules. Explain parameters, return values, and potential errors (`@throws`).
- Add inline comments to explain complex or non-obvious logic.

### 4.3. Error Handling

- Use custom error classes that extend `Error` or `RangeError` for specific, predictable error handling (e.g., `CryptoUnavailableError`, `InvalidParameterError`).
- Wrap potentially failing operations in `try...catch` blocks to ensure resilience and prevent page crashes.
- Fail loudly and securely. If a critical API is missing, throw an error or apply a fallback class; do not use an insecure alternative.

## 5. Architectural and Security Principles

This is the most critical section. Your suggestions **must** align with these principles.

### 5.1. Security-First Mindset

- **No Insecure Fallbacks:** Never suggest `Math.random()`. All randomness must come from the **Web Crypto API** (`crypto.getRandomValues`, `crypto.randomUUID`). If the API is unavailable, the code must throw a `CryptoUnavailableError`.
- **Selector Allowlisting:** When querying the DOM, do not use arbitrary selectors. Validate selectors against a hardcoded allowlist of expected IDs and classes to prevent manipulation.
- **Bias-Free Randomness:** When generating random integers within a range, use a cryptographically sound method like **rejection sampling** to eliminate modulo bias.
- **CSP-Safe Logging:** For development logging, use the provided `secureDevLog` utility, which dispatches a `CustomEvent` in browsers to avoid direct `console` access. This function must be a no-op in production (`environment.isProduction`).
- **Input Validation:** Strictly validate all function parameters. Use centralized validation helpers (e.g., `validateNumericParam`) where possible.

### 5.2. Performance by Default

- **Use Modern APIs:** Prefer `IntersectionObserver` over `onscroll` events. Use the **Web Animations API (`element.animate`)** over manual `requestAnimationFrame` loops for animations, as it can run on the compositor thread.
- **Resource Conservation:** Pause animations or intensive tasks when the page is hidden by listening to the `visibilitychange` event.
- **Optimize Event Listeners:** Use `{ passive: true }` for scroll-related event listeners to improve scrolling performance.

### 5.3. Progressive Enhancement & Resilience

This section outlines the core strategy for building robust components that adapt to the user's environment. The fundamental principle is: **functionality over flair**. The core purpose of a component must never be compromised by a failing enhancement.

#### 5.3.1. Capability Detection and Tiered Experience

- **Centralized Detection:** Use a dedicated `CapabilityDetector` class to probe for browser features. This detection logic should be executed once and its results cached in a private static field (e.g., `static #cache`) to prevent redundant checks.
- **Tiered Levels:** The detector must assign a clear experience `level` based on a hierarchy of available APIs. Propose code that adheres to this structure:
  - `'premium'`: The best experience, requiring cutting-edge APIs like `document.startViewTransition`.
  - `'enhanced'`: A rich experience using the Web Animations API with hardware-accelerated properties (`composite: 'add'/'replace'`).
  - `'standard'`: A functional experience using the basic Web Animations API.
  - `'fallback'`: The most basic, functional state where JavaScript enhancements are disabled, relying on CSS for core presentation.

#### 5.3.2. Graceful Degradation and Fallback Mechanisms

- **Accessibility First:** The `(prefers-reduced-motion: reduce)` media query is an explicit user request for accessibility. It must be honored unconditionally. Upon detection, all non-essential JavaScript animations must be disabled, and a `.reduced-motion` class must be added to the root component element.
- **Predictable Fallback Classes:** The component's resilience depends on a clear, class-based state machine managed via CSS.
  - `.js-animation-fallback`: Apply this class when the `CapabilityDetector` returns the `'fallback'` level. This class should trigger simpler CSS transitions or remove transitions entirely.
  - `.js-animation-failed`: This class must be applied within a top-level `try...catch` block in the initialization sequence. It signifies a runtime error and acts as a final safety net to ensure the component remains usable.

#### 5.3.3. Advanced Security and DOM Interaction

- **Strict CSP Compliance:** To ensure compatibility with strict Content Security Policies, the following rules are non-negotiable:
  - **No Inline Styles:** **Never generate code that uses the `style` attribute on HTML elements.** All styling must be done by adding/removing CSS classes. A rare, controlled exception is the programmatic setting of `element.style.cssText` for non-visible, utility elements (like the scroll sentinel), but this must be justified and documented.
  - **No Inline Event Handlers:** **Never use `onclick`, `onmouseover`, etc.** All event handling must be done programmatically using `element.addEventListener()`.
- **Embrace Trusted Types:** To mitigate DOM XSS vulnerabilities, adopt a Trusted Types-first mindset.
  - **Avoid Dangerous Sinks:** Do not use `innerHTML`, `outerHTML`, or `insertAdjacentHTML` with user-influenced data.
  - **Prefer Safe Alternatives:** Use `textContent` for inserting text. For creating DOM structure, use `document.createElement()` and `element.append()`. This practice eliminates DOM XSS vectors by design.
  - If a component _must_ handle HTML strings (which should be avoided), it would require a dedicated Trusted Type policy, a decision that needs architectural review.

#### 5.3.4. Forward-Looking Best Practices (ECMAScript 2024/2025 & Typing)

- **Strong Typing via JSDoc:** This project uses JavaScript, but maintains type safety through comprehensive JSDoc.
  - **Mandatory Typing:** All functions, methods, parameters, return values, and class fields must have explicit types defined using JSDoc.
  - **Use Advanced Types:** Leverage `@typedef` and `@template` to define complex object shapes and generic types. Use `@interface` to define the public contract of classes, as seen in the `header-animator.d.ts` file. This provides excellent IntelliSense and allows for static analysis.
- **Modern ECMAScript Conformance:** Write code that is clean, concise, and leverages the latest stable language features.
  - **Prefer `Object.groupBy()`:** When transforming an array into a grouped object, use the `Object.groupBy()` method over a manual `Array.prototype.reduce()` implementation for improved readability and intent.
  - **Use `Promise.withResolvers()`:** For advanced asynchronous patterns where a promise needs to be resolved or rejected from an external scope, use the `Promise.withResolvers()` static method. It is cleaner and less error-prone than the traditional "deferred" pattern.
  - **Leverage New `Set` Methods:** When performing set logic, use the new built-in methods like `Set.prototype.union()` and `Set.prototype.intersection()` instead of reimplementing this logic manually.

### 5.4. Lifecycle Management

- Implement robust `initialize()` and `destroy()` methods in manager classes.
- The `destroy()` method must clean up **all** resources: event listeners (via `AbortController`), observers (`disconnect()`), animations (`cancel()`), and DOM elements created by the script to prevent memory leaks, especially in Single-Page Applications (SPAs).

## 6. Contribution and Community Guidelines

- All contributions must adhere to the **Contributor Covenant Code of Conduct**. Foster a welcoming, inclusive, and harassment-free environment.
- Pull requests should be descriptive, explaining the "what" and "why" of the changes.
- Security vulnerabilities must be reported privately according to the `SECURITY.md` policy, preferably via GitHub Security Advisories.
