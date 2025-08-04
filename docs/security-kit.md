# Security Kit

**SPDX-License-Identifier:** MIT  
**SPDX-FileCopyrightText:** © 2025 David Osipov <personal@david-osipov.vision>  
**Author ISNI:** 0000 0005 1802 960X  
**Version:** 3.0.0

---

## Vision

`security-kit` is a modern, performant, and secure JavaScript module designed to provide robust cryptographic utilities and safe development helpers. This library was conceived and created by David Osipov, leveraging a committee of expert AIs to ensure cutting-edge, secure, and efficient code.

Our core philosophy is to empower developers to build secure applications by default. This module exclusively uses the **Web Crypto API**, available in all modern browsers and Node.js environments, and will **never** fall back to insecure or predictable methods like `Math.random()`.

## Core Principles

As both a seasoned JavaScript developer and a cybersecurity specialist, the architecture of this library is founded on these non-negotiable principles:

*   🛡️ **Security First:** Every function is built with security as the primary concern. We leverage native, cryptographically secure pseudo-random number generators (CSPRNG) for all random data generation.
*   🚫 **No Insecure Fallbacks:** The library will throw an error if a secure cryptographic API is not available, rather than silently failing or using a non-secure alternative. This prevents the accidental introduction of vulnerabilities.
*   🎲 **Bias-Free Randomness:** For generating random numbers within a specific range, we use rejection sampling to eliminate modulo bias, ensuring a uniform distribution that is critical for cryptographic operations.
*   ⚡ **Modern and Performant:** The code is optimized for modern JavaScript environments, using asynchronous patterns (`async/await`) for non-blocking operations and efficient synchronous alternatives where appropriate.
*   👨‍💻 **Developer-Friendly API:** The library provides a clean, intuitive, and well-documented API, including custom error types for robust error handling.

---

## Code Quality & Security Analysis: Why Use `security-kit`?

This library isn't just a collection of functions; it's a manifestation of a security-first engineering philosophy. Every line is written with intent, adhering to modern best practices in both JavaScript development and applied cryptography. Here is a breakdown of why this script stands out in terms of quality, security, and design.

### 1. Uncompromising Security by Design

The most critical aspect of a security library is that it must be secure by default and prevent developers from accidentally making insecure choices.

*   **No Insecure Fallbacks:** The library makes a deliberate choice to **fail loudly** rather than **fail silently and insecurely**. The `ensureCrypto` and `ensureCryptoSync` functions will throw a `CryptoUnavailableError` if the Web Crypto API is not found. They **do not** fall back to `Math.random()`, which is predictable and completely unsuitable for cryptographic purposes. This is a fundamental security guarantee.

*   **Bias-Free Random Number Generation:** Generating a random number in a range is a common source of subtle but critical bugs. A naive implementation like `random() % range` introduces **modulo bias**, making some numbers slightly more likely to appear than others. For cryptography, this is a fatal flaw. This script uses **rejection sampling** in `getSecureRandomInt`, a cryptographically sound method that guarantees a perfectly uniform distribution.

    ```javascript
    // Snippet from getSecureRandomInt
    do {
      // ... generate random bits
      randomValue &= mask;
    } while (randomValue >= range); // Reject and retry if out of range
    ```
    This `do...while` loop is the heart of the unbiased generation, ensuring every number in the `[min, max]` range has an equal probability of being chosen.

*   **High-Precision Randomness:** The `getSecureRandom` function intelligently prefers `BigUint64Array` to generate a 52-bit precision float, which is the same precision as a standard double-precision float's mantissa. This provides higher-quality randomness than the 32-bit fallback, demonstrating a deep understanding of numeric precision in JavaScript.

*   **Adherence to Standards (RFC 4122):** The fallback implementation for `generateSecureUUID` isn't just random bytes formatted as a UUID. It correctly sets the version (4) and variant bits according to RFC 4122, ensuring the generated UUID is compliant and interoperable.

    ```javascript
    // Snippet from generateSecureUUID
    buffer[6] = (buffer[6] & 0x0f) | 0x40; // Set version to 4
    buffer[8] = (buffer[8] & 0x3f) | 0x80; // Set variant to 10xx
    ```

### 2. Modern, Performant, and Maintainable Code

The script is a model of modern JavaScript best practices.

*   **Asynchronous by Default:** Most functions are `async`, leveraging `Promise`s to ensure non-blocking operations. This is crucial for performance in both browser and Node.js environments.
*   **Strategic Synchronous Alternatives:** The library provides `...Sync` versions for key functions. This shows a pragmatic understanding that in some specific scenarios (e.g., initial script setup, certain server-side contexts), a synchronous API is necessary.
*   **Efficient Caching:** The `_cachedCrypto` variable prevents redundant lookups for the crypto object, a small but meaningful performance optimization that avoids re-checking the environment on every call.
*   **ES Modules (`import`/`export`):** The use of ES Modules enables static analysis, tree-shaking by bundlers (like Webpack or Rollup) to reduce final bundle size, and a clean, modern dependency structure.
*   **DRY (Don't Repeat Yourself) Principle:** Input validation is centralized into helper functions like `validateNumericParam` and `validateProbability`. This makes the code cleaner, easier to maintain, and ensures validation logic is consistent across the entire API.

### 3. Excellent Developer Experience (DX)

A library is only as good as it is usable. `security-kit` is designed with the developer in mind.

*   **Robust and Specific Error Handling:** Instead of throwing generic `Error` or `RangeError`, the library uses custom error classes (`CryptoUnavailableError`, `InvalidParameterError`). This allows developers to write clean, specific `try...catch` blocks to handle different failure modes gracefully.
*   **Comprehensive JSDoc Comments:** Every public function is meticulously documented with JSDoc. This provides rich IntelliSense in modern editors like VS Code, explaining parameters, return types, and potential exceptions, which drastically reduces implementation errors.
*   **CSP-Safe Development Logging:** The `secureDevLog` function is a standout feature for security-conscious developers. In production, it's a no-op. In development browsers, it dispatches a `CustomEvent` instead of directly calling `console.log()`. This prevents a class of XSS attacks where an attacker could overwrite `console.log` to exfiltrate data. It's a thoughtful, professional-grade security hardening measure.

---

## Features

*   ✅ Asynchronous & Synchronous Functions
*   ✅ Cryptographically Secure ID & UUID Generation
*   ✅ Unbiased Random Integer & Float Generation
*   ✅ Secure Probabilistic Throttling Helper
*   ✅ Safe Environment Detection (Development vs. Production)
*   ✅ CSP-Safe Structured Development Logging

## Installation

```bash
npm install security-kit
```

## API Documentation

### Custom Errors

For robust error handling, the module exports custom error classes.

*   `CryptoUnavailableError`: Thrown when a compliant Web Crypto API cannot be found in the environment.
*   `InvalidParameterError`: Thrown when a function receives an invalid argument (e.g., out of the allowed range).

### `generateSecureId(length: number = 12): Promise<string>`

Asynchronously generates a cryptographically secure random ID using hexadecimal characters.

*   **`length`**: The desired length of the ID. Must be an integer between 1 and 1024.
*   **Returns**: A `Promise` that resolves with the random hexadecimal string.
*   **Throws**: `InvalidParameterError`, `CryptoUnavailableError`.

**Example:**
```javascript
import { generateSecureId } from 'security-kit';

const myId = await generateSecureId(16);
console.log(myId); // e.g., 'a3f9b1d8c7e0f2a1'
```

### `generateSecureIdSync(length: number = 12): string`

Synchronously generates a cryptographically secure random ID. Use this only when an asynchronous operation is not feasible.

*   **`length`**: The desired length of the ID. Must be an integer between 1 and 1024.
*   **Returns**: The random hexadecimal string.
*   **Throws**: `InvalidParameterError`, `CryptoUnavailableError`.

**Example:**
```javascript
import { generateSecureIdSync } from 'security-kit';

const myId = generateSecureIdSync();
console.log(myId); // e.g., 'b8d2e6f0a1c9'
```

### `generateSecureUUID(): Promise<string>`

Asynchronously generates a cryptographically secure v4 UUID. It uses the native `crypto.randomUUID()` where available, otherwise it uses a secure fallback implementation based on `crypto.getRandomValues()`.

*   **Returns**: A `Promise` that resolves with a 36-character v4 UUID.
*   **Throws**: `CryptoUnavailableError`.

**Example:**
```javascript
import { generateSecureUUID } from 'security-kit';

const myUuid = await generateSecureUUID();
console.log(myUuid); // e.g., '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
```

### `getSecureRandomInt(min: number, max: number): Promise<number>`

Asynchronously generates a secure random integer within a specified inclusive range `[min, max]`. This function uses **rejection sampling** to avoid modulo bias, ensuring a perfectly uniform distribution.

*   **`min`**: The minimum integer value.
*   **`max`**: The maximum integer value.
*   **Returns**: A `Promise` that resolves with a secure random integer in the specified range.
*   **Throws**: `InvalidParameterError`, `CryptoUnavailableError`.

**Example:**
```javascript
import { getSecureRandomInt } from 'security-kit';

const diceRoll = await getSecureRandomInt(1, 6);
console.log(diceRoll);
```

### `getSecureRandomAsync(): Promise<number>`

Asynchronously generates a cryptographically secure random floating-point number between 0 (inclusive) and 1 (exclusive) with high precision.

*   **Returns**: A `Promise` that resolves with the secure random float.
*   **Throws**: `CryptoUnavailableError`.

**Example:**
```javascript
import { getSecureRandomAsync } from 'security-kit';

const randomChance = await getSecureRandomAsync();
console.log(randomChance); // e.g., 0.7345...
```

### `getSecureRandom(): number`

Synchronously generates a cryptographically secure random floating-point number between 0 (inclusive) and 1 (exclusive).

*   **Returns**: A secure random float.
*   **Throws**: `CryptoUnavailableError`.

**Example:**
```javascript
import { getSecureRandom } from 'security-kit';

const randomChance = getSecureRandom();
console.log(randomChance);
```

### `shouldExecuteThrottledAsync(probability: number): Promise<boolean>`

Asynchronously determines if an action should execute based on a given probability. Useful for secure, probabilistic sampling or feature throttling.

*   **`probability`**: A number between 0 and 1.
*   **Returns**: A `Promise` that resolves with `true` or `false`.
*   **Throws**: `InvalidParameterError`, `CryptoUnavailableError`.

**Example:**
```javascript
import { shouldExecuteThrottledAsync } from 'security-kit';

// Run this code block for approximately 10% of users
if (await shouldExecuteThrottledAsync(0.1)) {
  // Execute feature A
}
```

### `shouldExecuteThrottled(probability: number): boolean`

Synchronously determines if an action should execute based on a given probability.

*   **`probability`**: A number between 0 and 1.
*   **Returns**: `true` or `false`.
*   **Throws**: `InvalidParameterError`, `CryptoUnavailableError`.

**Example:**
```javascript
import { shouldExecuteThrottled } from 'security-kit';

// Log data for approximately 1% of requests
if (shouldExecuteThrottled(0.01)) {
  // Log performance data
}
```

### `environment`

An object that provides cached, safe detection of the current runtime environment.

*   **`environment.isDevelopment`**: `boolean` - Returns `true` if the environment is determined to be for development (e.g., `NODE_ENV` is 'development', hostname is `localhost`).
*   **`environment.isProduction`**: `boolean` - Returns `true` if the environment is not a development one.

**Example:**
```javascript
import { environment } from 'security-kit';

if (environment.isProduction) {
  // Production-only logic
}
```

### `secureDevLog(level, component, message, context = {})`

A structured, CSP-safe logging utility that **only runs in development environments**. In production, it does nothing. In a browser, it dispatches a `CustomEvent` to avoid direct `console` access, which can be a security risk. In Node.js, it uses the corresponding `console` method.

*   **`level`**: `'debug' | 'info' | 'warn' | 'error'`
*   **`component`**: `string` - The name of the component logging the message.
*   **`message`**: `string` - The log message.
*   **`context`**: `object` - Additional structured data to include.

**Example:**
```javascript
import { secureDevLog } from 'security-kit';

secureDevLog('info', 'AuthService', 'User login successful', { userId: 123 });

// In the browser, you can listen for these logs:
document.addEventListener('secure-dev-log', (e) => {
  console.log(e.detail);
});
```

---

## Environment Support

This module requires an environment that supports the **Web Crypto API**. This includes:
*   **Modern Browsers:** Chrome 37+, Firefox 34+, Safari 7.1+, Edge 12+.
*   **Node.js:** The `crypto.webcrypto` module is available in recent versions of Node.js.
*   **Web Workers & Service Workers:** The API is accessible in these contexts.

The library will not work in older environments like Internet Explorer 10 or below.

## Author and License

*   **Author:** David Osipov
*   **ISNI:** 0000 0005 1802 960X ([International Standard Name Identifier](https://isni.org/isni/000000051802960X))
*   **Contact:** <personal@david-osipov.vision>
*   **License:** MIT License. The license is specified using the [SPDX-License-Identifier](https://spdx.org/licenses/) standard, which is a machine-readable way to declare licenses.
