/**
 * Blog Image Zoom
 * A blog image wrapped in a link to an image file, e.g.
 * `[![alt](/img/a.png)](/img/a.png)`, opens enlarged on the same page instead
 * of in a new tab. Uses Fancybox, which scripts.html already loads site-wide
 * (the team page uses it too). Images that are not linked are left alone, and
 * without JavaScript the link still opens the image.
 */
(function () {
  "use strict";

  var IMAGE_HREF = /\.(png|jpe?g|gif|webp|avif|svg)([?#].*)?$/i;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    var images = document.querySelectorAll(".singleContent a[href] > img");
    Array.prototype.forEach.call(images, function (img) {
      var link = img.parentNode;
      if (!IMAGE_HREF.test(link.getAttribute("href"))) return;
      // one shared group, so the arrow keys step through the post's images
      link.setAttribute("data-fancybox", "post-images");
      link.removeAttribute("target");
    });
  }
})();
