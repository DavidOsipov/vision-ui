# Security Policy

## Our Commitment to Security

The Vision UI project is architected with a "security-first" philosophy. As the maintainer, I am deeply committed to ensuring the security and integrity of this codebase. I value the work of independent security researchers and believe that responsible disclosure is essential for maintaining a safe open-source ecosystem.

This policy outlines the process for reporting security vulnerabilities and what you can expect in return.

---

## Supported Versions

Only the latest version of the scripts available in the `main` branch of this repository is actively supported. Vulnerabilities will be addressed in the most current version.

---

## 🛡️ Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you believe you have discovered a security vulnerability, please report it to me privately to protect the project's users.

### Private Reporting Channel

Please send a detailed email to:
**security@david-osipov.vision**

### Encrypting Your Report (Recommended)

For highly sensitive information, I strongly encourage you to encrypt your report using my PGP public key. This ensures that the details of the vulnerability are protected in transit.

-   **PGP Public Key:** [`D3FC4983E500AC3F7F136EB80E55C4A47454E82E`](https://openpgpkey.david-osipov.vision/.well-known/openpgpkey/david-osipov.vision/D3FC4983E500AC3F7F136EB80E55C4A47454E82E.asc)

### What to Include in Your Report

To help me validate and fix the issue as quickly as possible, please include the following in your report:

-   **A clear and descriptive title** for your report.
-   **The type of vulnerability** (e.g., Cross-Site Scripting, Insecure Randomness, Prototype Pollution).
-   **The affected script(s)** and version(s).
-   **A detailed description** of the vulnerability and its potential impact.
-   **A step-by-step proof-of-concept (PoC)** that demonstrates the vulnerability. This is the most important part.
-   **Any relevant configurations** or environmental details.

---

## Our Commitment to You

When you report a vulnerability in accordance with this policy, I commit to the following:

-   I will acknowledge receipt of your report within **48 business hours**.
-   I will provide an initial assessment of the vulnerability's validity and severity.
-   I will keep you updated on the progress of the remediation efforts.
-   I will notify you when a fix has been released.
-   I will publicly credit you for your discovery in the release notes and commit message, unless you prefer to remain anonymous.

---

## Scope

This policy applies to the JavaScript code within the `/src` directory of this repository.

### Out of Scope

The following are considered out of scope for this security policy:

-   Vulnerabilities in third-party websites or services that use this code.
-   Vulnerabilities related to the underlying browser or Node.js runtime environment (e.g., a bug in the Web Crypto API itself). Please report these to the respective vendors.
-   Issues related to the security of GitHub's infrastructure.
-   Best practice recommendations that do not represent a direct, exploitable vulnerability.

Thank you for helping keep Vision UI and its users safe.
