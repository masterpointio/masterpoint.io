/**
 * Copy for LLM - Sticky Header with Copy-to-Clipboard
 * Shows a sticky bar when scrolling past the main header on blog posts.
 * Copies the blog content as clean markdown to the clipboard.
 */
(function () {
  "use strict";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    var stickyHeader = document.getElementById("blogStickyHeader");
    var copyBtn = document.getElementById("copyForLlm");
    var rawContent = document.getElementById("rawMarkdownContent");

    if (!stickyHeader || !copyBtn || !rawContent) return;

    // --- Scroll-based visibility ---
    var pageHeader = document.querySelector("header[aria-label='header']");
    if (!pageHeader) return;

    function updateVisibility() {
      var headerBottom = pageHeader.getBoundingClientRect().bottom;
      if (headerBottom <= 0) {
        stickyHeader.classList.add("visible");
      } else {
        stickyHeader.classList.remove("visible");
      }
    }

    updateVisibility();

    var scrollTimeout;
    window.addEventListener(
      "scroll",
      function () {
        if (!scrollTimeout) {
          scrollTimeout = setTimeout(function () {
            updateVisibility();
            scrollTimeout = null;
          }, 50);
        }
      },
      { passive: true },
    );

    // --- Copy logic ---
    copyBtn.addEventListener("click", function () {
      var content = rawContent.textContent;
      content = cleanContent(content);

      copyToClipboard(content).then(function () {
        showCopiedFeedback();
      });
    });

    function cleanContent(text) {
      // Fix relative or protocol-relative URL line — make it absolute
      text = text.replace(
        /^(URL: )(\/\/[^\s]*|\/[^\s]*)/m,
        function (match, prefix, path) {
          if (path.startsWith("//")) {
            return prefix + window.location.protocol + path;
          }
          return prefix + window.location.origin + path;
        },
      );

      // Convert lightboximg shortcodes to markdown images
      // {{< lightboximg "/path/to/img.png" "Alt text" >}}
      text = text.replace(
        /\{\{<\s*lightboximg\s+"([^"]+)"\s+"([^"]+)"\s*>\}\}/g,
        "![$2]($1)",
      );

      // Remove signup shortcodes
      text = text.replace(/\{\{<\s*signup\s*>\}\}/g, "");

      // Remove other common shortcodes that don't translate to markdown
      text = text.replace(
        /\{\{<\s*(button|buttonout)\s+link="([^"]+)"\s+text="([^"]+)"\s*>\}\}/g,
        "[$3]($2)",
      );

      // Convert HTML line breaks to newlines
      text = text.replace(/<br\s*\/?>/gi, "\n");

      // Clean up excessive blank lines (3+ newlines → 2)
      text = text.replace(/\n{3,}/g, "\n\n");

      // Trim leading/trailing whitespace
      text = text.trim();

      return text;
    }

    function copyToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(function () {
          return fallbackCopy(text);
        });
      }
      return fallbackCopy(text);
    }

    function fallbackCopy(text) {
      return new Promise(function (resolve, reject) {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          document.body.removeChild(textarea);
        }
      });
    }

    function showCopiedFeedback() {
      var originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fa fa-check"></i> Copied!';
      copyBtn.classList.add("copied");

      setTimeout(function () {
        copyBtn.innerHTML = originalHTML;
        copyBtn.classList.remove("copied");
      }, 2000);
    }
  }
})();
