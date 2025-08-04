// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: © 2025 David Osipov <personal@david-osipov.vision>
// Author ISNI: 0000 0005 1802 960X
// Author ISNI URL: https://isni.org/isni/000000051802960X
// Author ORCID: 0009-0005-2713-9242
// Author VIAF: 139173726847611590332
// Author Wikidata: Q130604188
// Version: 2.0.0.1
// src/scripts/header-animator.d.ts

export interface AnimationCapabilities {
  webAnimations: boolean;
  viewTransitions: boolean;
  intersectionObserver: boolean;
  reducedMotion: boolean;
  composite: boolean;
  level: 'premium' | 'enhanced' | 'standard' | 'fallback';
}

export interface PerformanceMetrics {
  initStart: number;
  initComplete: number;
  animationCount: number;
  errorCount: number;
  initDuration: number;
  animationsActive: number;
  elementsTracked: number;
  capabilities: string;
}

export declare class CapabilityDetector {
  static detect(): AnimationCapabilities;
}

export declare class ElementValidator {
  static validateSelector(selector: string): string;
  static validateElement(element: Element, expectedId?: string): Element;
  static queryElementSafely(selector: string, context?: Document | Element): Element | null;
}

export declare class EnhancedHeaderAnimator {
  constructor(headerElement: Element);
  getMetrics(): PerformanceMetrics;
  destroy(): void;
}

export declare class HeaderAnimationManager {
  static initialize(): void;
  static destroy(): void;
  static getInstance(): EnhancedHeaderAnimator | null;
}

declare const _default: typeof HeaderAnimationManager;
export default _default;
