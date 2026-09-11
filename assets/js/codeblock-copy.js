/**
 * Code Block Copy Button
 * Adds copy-to-clipboard behavior to code blocks opted in with `{copy=true}`,
 * which the codeblock render hook wraps in `.codeblock-copy-wrap`.
 */
(function () {
  "use strict";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    var copyButtons = document.querySelectorAll(".codeblock-copy-btn");
    Array.prototype.forEach.call(copyButtons, function (btn) {
      btn.addEventListener("click", function () {
        var wrap = btn.closest(".codeblock-wrap");
        var pre = wrap && wrap.querySelector("pre");
        if (!pre) return;

        copyToClipboard(pre.innerText).then(function () {
          showCopiedFeedback(btn);
        });
      });
    });

    var expandButtons = document.querySelectorAll(".codeblock-expand-btn");
    Array.prototype.forEach.call(expandButtons, function (btn) {
      btn.addEventListener("click", function () {
        var wrap = btn.closest(".codeblock-wrap");
        if (!wrap) return;

        var collapsed = wrap.classList.toggle("is-collapsed");
        btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        btn.textContent = collapsed ? "Show more" : "Show less";

        // When re-collapsing, keep the top of the block in view.
        if (collapsed) {
          var top = wrap.getBoundingClientRect().top;
          if (top < 0) {
            wrap.scrollIntoView({ block: "start" });
          }
        }
      });
    });
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

  function showCopiedFeedback(btn) {
    var originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-check"></i> Copied!';
    btn.classList.add("copied");

    setTimeout(function () {
      btn.innerHTML = originalHTML;
      btn.classList.remove("copied");
    }, 2000);
  }
})();
