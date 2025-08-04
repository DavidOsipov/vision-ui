# Vision UI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Security: Hardened](https://img.shields.io/badge/Security-Hardened-brightgreen)](./docs/03-security-kit.md)

Vision UI is a collection of enterprise-grade, dependency-free modules for modern web projects. Each component is engineered for maximum performance, security, and accessibility, designed to be dropped into any project (Astro, Eleventy, vanilla HTML) with minimal configuration.

## The Philosophy: AI-Orchestrated Engineering

This project is more than just a code library; it's a case study in a new paradigm of software creation.

As a Product Manager, I architected and directed the development of these modules by orchestrating a "committee" of specialized AI models. My role was to define the strategic requirements—uncompromising security, buttery-smooth performance, modern API usage, and robust accessibility—and then guide the AI through over a dozen iterations of generation, critique, and refinement until the code met enterprise-grade standards.

The result is a testament to a workflow where human strategic oversight and AI's technical execution combine to produce superior, secure, and performant software.

---

## Available Packages

The library is organized into two categories: UI Components and Core Utilities.

### UI Components

Visual, interactive components for enhancing user experience.

*   ### Header Animator
    A performant, scroll-aware header that becomes compact as the user scrolls down. It uses `IntersectionObserver` for efficiency and includes a subtle hover effect.

    ➡️ **[Read the full `header-animator` documentation](./docs/header-animator.md)**

*   ### Dialog Menu
    A fully accessible, progressively enhanced mobile menu that uses the best animation engine available in the user's browser, from the modern View Transitions API down to a simple, robust WAAPI fallback.

    ➡️ **[Read the full `dialog-menu` documentation](./docs/mobile-dialog-menu.md)**

### Core Utilities

Foundational modules for building secure and robust applications.

*   ### Security Kit
    A zero-dependency module for robust cryptographic operations. It provides cryptographically secure random number/ID generation, bias-free integer functions, and safe development helpers, using the Web Crypto API exclusively.

    ➡️ **[Read the full `security-kit` documentation](./docs/security-kit.md)**

---

## Getting Started

### 1. Add the Scripts to Your Project

Copy the desired files from `src/` into your project's JavaScript folder.

### 2. Include the Scripts in Your HTML

Include the scripts as modules in your main layout or page. It's best to place them before the closing `</body>` tag.

```html
<!-- Example: Using the Header Animator and Security Kit -->
<script type="module" src="/path/to/your/scripts/header-animator.js"></script>
<script type="module" src="/path/to/your/scripts/security-kit.js"></script>
```

### 3. Follow Component-Specific Documentation

Each component has its own documentation with details on required HTML structure and configuration. Please refer to the links in the "Available Packages" section above.

---

## Roadmap

This project is actively maintained and growing. Key future goals include:

-   [ ] **TypeScript Conversion:** Migrating all scripts to TypeScript and providing official type definitions (`.d.ts`) for superior developer experience and type safety.
-   [ ] **NPM Package:** Publishing Vision UI as an NPM package for easier installation and version management.
-   [ ] **New Components:** Adding more high-quality components, such as accessible tabs and accordions.
-   [ ] **Unit & Integration Testing:** Implementing a comprehensive test suite to formalize the quality assurance process.

## Contributing

Contributions, bug reports, and feature requests are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to participate in this project.

## Author and License

*   **Author:** This project was architected and directed by **David Osipov**, an AI-Driven B2B Lead Product Manager. You can learn more about my work and philosophy at [david-osipov.vision](https://david-osipov.vision).
*   **ISNI:** 0000 0005 1802 960X ([International Standard Name Identifier](https://isni.org/isni/000000051802960X))
*   **Contact:** <personal@david-osipov.vision>
*   **License:** MIT License. The license is specified using the [SPDX-License-Identifier](https://spdx.org/licenses/) standard, which is a machine-readable way to declare licenses.

