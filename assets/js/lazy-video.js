/**
 * Lazy Loop Video
 * Drives the `loop-video` shortcode. Nothing is fetched until the figure is
 * near the viewport, playback then runs muted on repeat while it is on screen,
 * and pauses the moment it scrolls away or the tab is hidden. Also renders the
 * scrub bar: elapsed time, played and buffered progress, and seeking.
 */
(function () {
  "use strict";

  // Start fetching a little before the frame is actually on screen so the
  // first frame is decoded by the time the reader gets there.
  var PRELOAD_MARGIN = "300px 0px";
  // Play once a quarter of the frame is showing; pause when none of it is.
  var PLAY_RATIO = 0.25;
  // How far the arrow keys jump along the timeline.
  var KEY_STEP_SECONDS = 5;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    var figures = document.querySelectorAll(".loop-video");
    if (!figures.length) return;

    // Readers who asked for less motion get the poster and a play button
    // instead of something that starts moving on its own.
    var reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    Array.prototype.forEach.call(figures, function (figure) {
      setup(figure, reduceMotion);
    });
  }

  function setup(figure, reduceMotion) {
    var video = figure.querySelector(".loop-video__el");
    var toggle = figure.querySelector(".loop-video__toggle");
    var track = figure.querySelector(".loop-video__track");
    var rail = figure.querySelector(".loop-video__rail");
    var played = figure.querySelector(".loop-video__progress");
    var buffered = figure.querySelector(".loop-video__buffered");
    var timeEl = figure.querySelector(".loop-video__time");
    if (!video) return;

    var loaded = false;
    var onScreen = false;
    var scrubbing = false;
    // A seek asked for before the metadata landed, replayed once it does.
    var pendingSeek = null;
    // The reader's explicit choice, which outlives scrolling in and out.
    var userPaused = reduceMotion;

    // Only now do the controls mean anything, so only now show them.
    figure.classList.add("is-interactive");
    setToggleState();
    renderProgress();

    // Autoplay policies only allow muted playback, and the encode has no audio
    // track anyway. Set the property too — the attribute alone is ignored by
    // some browsers once the element has been touched by script.
    video.muted = true;

    if (typeof window.IntersectionObserver !== "function") {
      // Without an observer there is no cheap way to know when the frame is on
      // screen, so just load it and let the reader drive it.
      load();
      sync();
      return;
    }

    new window.IntersectionObserver(
      function (entries) {
        if (!entries[entries.length - 1].isIntersecting) return;
        load();
      },
      { rootMargin: PRELOAD_MARGIN },
    ).observe(figure);

    new window.IntersectionObserver(
      function (entries) {
        var entry = entries[entries.length - 1];
        var ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        onScreen = ratio >= PLAY_RATIO;
        sync();
      },
      { threshold: [0, PLAY_RATIO] },
    ).observe(figure);

    document.addEventListener("visibilitychange", sync);

    if (toggle) {
      toggle.addEventListener("click", togglePlayback);
    }

    // Clicking the picture toggles playback, the way any video player does.
    // The control bar is layered above the video, so clicks that land on it
    // never reach here and cannot double-toggle.
    video.addEventListener("click", togglePlayback);

    video.addEventListener("timeupdate", renderProgress);
    video.addEventListener("seeked", renderProgress);
    video.addEventListener("progress", renderBuffered);
    video.addEventListener("loadedmetadata", function () {
      if (pendingSeek !== null) {
        seekToFraction(pendingSeek);
        pendingSeek = null;
      }
      renderProgress();
      renderBuffered();
    });

    if (track) {
      track.addEventListener("pointerdown", function (event) {
        // Keep the gesture from selecting text or scrolling the page.
        event.preventDefault();
        scrubbing = true;
        track.focus();
        if (track.setPointerCapture) {
          track.setPointerCapture(event.pointerId);
        }
        seekToClientX(event.clientX);
      });

      track.addEventListener("pointermove", function (event) {
        if (scrubbing) seekToClientX(event.clientX);
      });

      var endScrub = function () {
        scrubbing = false;
      };
      track.addEventListener("pointerup", endScrub);
      track.addEventListener("pointercancel", endScrub);

      track.addEventListener("keydown", onTrackKeydown);
    }

    function togglePlayback() {
      userPaused = !userPaused;
      load();
      sync();
    }

    // Swap the deferred sources in once, then let the element pick them up.
    function load() {
      if (loaded) return;
      loaded = true;

      var sources = video.querySelectorAll("source[data-lv-src]");
      Array.prototype.forEach.call(sources, function (source) {
        source.setAttribute("src", source.getAttribute("data-lv-src"));
        source.removeAttribute("data-lv-src");
      });

      // Resource selection already ran and found nothing at parse time, so the
      // element needs an explicit nudge to notice the sources we just added.
      video.load();
    }

    // Single place that decides whether this video should be running.
    function sync() {
      var shouldPlay = onScreen && !userPaused && !document.hidden;

      if (shouldPlay) {
        load();
        var playing = video.play();
        if (playing && typeof playing.catch === "function") {
          playing.catch(function () {
            // Blocked by an autoplay policy or interrupted by a pause. Fall
            // back to showing a play button rather than a frozen frame.
            userPaused = true;
            setToggleState();
          });
        }
      } else if (!video.paused) {
        video.pause();
      }

      setToggleState();
    }

    function setToggleState() {
      if (!toggle) return;
      var showPlay = userPaused;

      var label = showPlay ? "Play video" : "Pause video";
      toggle.setAttribute("aria-label", label);
      // Which glyph shows is the stylesheet's job, keyed off `is-paused`.
      // Font Awesome's JS build replaces the <i> with an <svg>, so there is no
      // element here worth reaching into.
      figure.classList.toggle("is-paused", showPlay);
    }

    // NaN until the metadata lands, so every reader guards on this.
    function duration() {
      var value = video.duration;
      return isFinite(value) && value > 0 ? value : 0;
    }

    function renderProgress() {
      var total = duration();
      var at = video.currentTime || 0;
      var fraction = total ? at / total : 0;

      if (played) played.style.width = fraction * 100 + "%";
      if (timeEl) timeEl.textContent = formatTime(at);
      if (track) {
        track.setAttribute("aria-valuenow", Math.round(fraction * 100));
        var spoken = formatTime(at) + " of " + formatTime(total);
        track.setAttribute("aria-valuetext", spoken);
      }
    }

    function renderBuffered() {
      if (!buffered) return;
      var total = duration();
      var ranges = video.buffered;
      var end = 0;

      if (total && ranges && ranges.length) {
        end = ranges.end(ranges.length - 1);
      }
      buffered.style.width = (total ? (end / total) * 100 : 0) + "%";
    }

    function seekToFraction(fraction) {
      var total = duration();
      if (!total) {
        pendingSeek = fraction;
        return;
      }
      video.currentTime = Math.max(0, Math.min(1, fraction)) * total;
      renderProgress();
    }

    function seekToClientX(clientX) {
      var box = (rail || track).getBoundingClientRect();
      if (!box.width) return;

      load();
      seekToFraction((clientX - box.left) / box.width);
    }

    function onTrackKeydown(event) {
      var total = duration();
      var at = video.currentTime || 0;
      var to;

      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        to = at + KEY_STEP_SECONDS;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        to = at - KEY_STEP_SECONDS;
      } else if (event.key === "Home") {
        to = 0;
      } else if (event.key === "End") {
        to = total;
      } else {
        return;
      }

      event.preventDefault();
      load();
      if (!total) return;
      video.currentTime = Math.max(0, Math.min(total, to));
      renderProgress();
    }

    function formatTime(seconds) {
      var whole = isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
      var mins = Math.floor(whole / 60);
      var secs = whole % 60;
      return mins + ":" + (secs < 10 ? "0" : "") + secs;
    }
  }
})();
