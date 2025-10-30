/**
 * Floating Table of Contents with Scroll Spy
 * Highlights the current section as user scrolls through the page
 */
(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTOC);
  } else {
    initTOC();
  }

  function initTOC() {
    const toc = document.querySelector('.floating-toc');
    if (!toc) return; // Exit if no TOC on page

    const tocLinks = toc.querySelectorAll('a');
    if (tocLinks.length === 0) return;

    // Handle TOC visibility based on scroll position
    function updateTOCVisibility() {
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

      // Find the article content area to determine when to show TOC
      const articleContent = document.querySelector('.singleContent');

      if (articleContent) {
        // Show TOC once user scrolls past the article start
        const articleTop = articleContent.getBoundingClientRect().top + window.pageYOffset;
        const triggerPoint = articleTop - 200; // Show 200px before content

        if (scrollPosition > triggerPoint) {
          toc.classList.add('visible');
        } else {
          toc.classList.remove('visible');
        }
      } else {
        // Fallback: show after scrolling 600px (roughly past banner)
        if (scrollPosition > 600) {
          toc.classList.add('visible');
        } else {
          toc.classList.remove('visible');
        }
      }
    }

    // Initialize visibility on page load
    updateTOCVisibility();

    // Update visibility on scroll (throttled for performance)
    let visibilityTimeout;
    window.addEventListener('scroll', function() {
      if (!visibilityTimeout) {
        visibilityTimeout = setTimeout(function() {
          updateTOCVisibility();
          visibilityTimeout = null;
        }, 50);
      }
    }, { passive: true });

    // Get all H2 heading elements that have IDs (these are TOC targets)
    const headings = Array.from(document.querySelectorAll('h2[id]'))
      .filter(heading => {
        // Only include headings in the main content area
        const singleContent = document.querySelector('.singleContent');
        return singleContent && singleContent.contains(heading);
      });

    if (headings.length === 0) return;

    // Smooth scroll when clicking TOC links
    tocLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetElement = document.getElementById(targetId);

          if (targetElement) {
            const headerHeight = 100; // Adjust based on your fixed header height
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        }
      });
    });

    // Intersection Observer for scroll spy
    const observerOptions = {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };

    let activeHeading = null;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          activeHeading = id;
          updateActiveTOCLink(id);
        }
      });
    }, observerOptions);

    // Observe all headings
    headings.forEach(heading => observer.observe(heading));

    // Update active link styling
    function updateActiveTOCLink(activeId) {
      // Remove active class from all links
      tocLinks.forEach(link => link.classList.remove('active'));

      // Add active class to current link
      if (activeId) {
        const activeLink = toc.querySelector(`a[href="#${activeId}"]`);
        if (activeLink) {
          activeLink.classList.add('active');

          // Scroll the TOC if needed to keep active link visible
          const tocNav = toc.querySelector('.toc-nav');
          if (tocNav) {
            const linkRect = activeLink.getBoundingClientRect();
            const navRect = tocNav.getBoundingClientRect();

            if (linkRect.bottom > navRect.bottom || linkRect.top < navRect.top) {
              activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        }
      }
    }

    // Handle initial scroll position on page load
    function setInitialActiveLink() {
      const scrollPosition = window.pageYOffset;
      let currentHeading = null;

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.offsetTop <= scrollPosition + 150) {
          currentHeading = heading.id;
          break;
        }
      }

      if (currentHeading) {
        updateActiveTOCLink(currentHeading);
      }
    }

    // Set initial active state
    setInitialActiveLink();

    // Fallback: throttled scroll event listener for browsers with poor Intersection Observer support
    let activeLinkTimeout;
    window.addEventListener('scroll', function() {
      if (activeLinkTimeout) {
        window.cancelAnimationFrame(activeLinkTimeout);
      }

      activeLinkTimeout = window.requestAnimationFrame(function() {
        setInitialActiveLink();
      });
    }, { passive: true });
  }
})();
