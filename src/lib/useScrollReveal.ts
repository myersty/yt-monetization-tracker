'use client';

import { useEffect } from 'react';

/**
 * Attaches an IntersectionObserver to all elements with scroll-reveal classes.
 * Call once in the page component. Adds .v2-visible when elements enter viewport.
 */
export function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(
      '.v2-reveal, .v2-reveal-stagger, .v2-reveal-scale'
    );

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('v2-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
