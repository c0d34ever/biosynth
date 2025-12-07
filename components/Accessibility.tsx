import React, { useEffect } from 'react';

export const Accessibility: React.FC = () => {
  useEffect(() => {
    // Skip link for keyboard navigation
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000] focus:px-4 focus:py-2 focus:bg-bio-500 focus:text-white focus:rounded-lg';
    skipLink.id = 'skip-link';
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main content landmark
    const main = document.querySelector('main');
    if (main && !main.id) {
      main.id = 'main-content';
      main.setAttribute('role', 'main');
    }

    // Add ARIA labels to icon-only buttons
    const iconButtons = document.querySelectorAll('button:not([aria-label]):has(svg):not(:has(span))');
    iconButtons.forEach(button => {
      const svg = button.querySelector('svg');
      if (svg && !button.getAttribute('aria-label')) {
        const title = svg.getAttribute('title') || button.getAttribute('title');
        if (title) {
          button.setAttribute('aria-label', title);
        }
      }
    });

    return () => {
      const skipLinkEl = document.getElementById('skip-link');
      if (skipLinkEl) {
        skipLinkEl.remove();
      }
    };
  }, []);

  return null;
};

