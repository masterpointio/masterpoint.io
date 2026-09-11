# Videos — working guide

How to put a silent looping demo clip into a blog post or case study via the
`loop-video` shortcode. **Keep it current and concise** — update it when the
shortcode, encoding recipe, or behavior changes, and delete mentions of anything
removed from the codebase. Document only what isn't obvious from the code.

---

## When to use it

`loop-video` is for **short, silent, looping demo clips** — screen recordings,
product walkthroughs, a tool doing something. Audio is stripped at encode time
and nothing in the player can unmute it.

For narrated video that someone sits and watches, use a plain
`<video width="100%" controls>` in the content instead (see
`content/referrals.md`). Don't autoplay narrated content.

Good length: **10–30s**. It loops, so it should read as ambient motion, not as
something with a beginning and an end.

---

## Files

| Path                                 | What                                         |
| ------------------------------------ | -------------------------------------------- |
| `layouts/shortcodes/loop-video.html` | Markup                                       |
| `assets/js/lazy-video.js`            | Lazy-load, play-on-view, scrub bar           |
| `assets/css/custom.scss`             | `.loop-video` block, inside `.singleContent` |
| `layouts/partials/scripts.html`      | Loads the JS for `.Section == "blog"`        |
| `static/video/<slug>/`               | The `.mp4`                                   |
| `static/img/updates/<slug>/`         | The poster `.jpg`                            |

Only loaded on blog pages. To use it elsewhere, add the `lazy-video.js` block in
`scripts.html` to that section too.

---

## Recipe

### 1. Encode

Requires `ffmpeg` (`brew install ffmpeg`). `SRC` is the raw recording.

```bash
SLUG=my-post-slug
OUT=static/video/$SLUG/my-clip
mkdir -p static/video/$SLUG static/img/updates/$SLUG

# MP4 / H.264
ffmpeg -i "$SRC" -an -c:v libx264 -profile:v high -preset slow -tune stillimage \
  -crf 24 -pix_fmt yuv420p -vf "scale=1280:-2:flags=lanczos" \
  -movflags +faststart "$OUT.mp4"

# Poster — a frame ~1s in, avoiding a black first frame
ffmpeg -ss 1 -i "$SRC" -frames:v 1 -vf "scale=1280:-2:flags=lanczos" -q:v 4 \
  "static/img/updates/$SLUG/my-clip-poster.jpg"
```

Flags that matter:

- `-an` — **required.** Strips audio.
- `-movflags +faststart` — moves the `moov` atom to the front so the MP4 streams
  before it has fully downloaded.
- `-pix_fmt yuv420p` — required for Safari/iOS.
- `-tune stillimage` + `flags=lanczos` — screen recordings are text-heavy and
  mostly static; this keeps small UI text legible through the downscale.
- `scale=1280:-2` — caps width at 1280 (the content column renders ~838px, so
  1280 covers 2× displays). `-2` keeps height even. **Never upscale.**

Raise CRF (26, 28) if you need it smaller. Text legibility is the binding
constraint — don't blur the text to hit a number.

### 2. Verify

```bash
# Must print NOTHING — no audio stream
ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$OUT.mp4"

# Note these for the shortcode's width/height
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT.mp4"
```

### 3. Call the shortcode

**On a single line.** See gotchas.

```markdown
{{< loop-video src="/video/my-post-slug/my-clip.mp4" poster="/img/updates/my-post-slug/my-clip-poster.jpg" width="1280" height="720" alt="What the clip shows" caption="Optional caption." >}}
```

| Param     | Required | Notes                                      |
| --------- | -------- | ------------------------------------------ |
| `src`     | yes      | Path to the `.mp4`                         |
| `poster`  | yes      | Still frame                                |
| `width`   | yes      | Intrinsic px width of the encode           |
| `height`  | yes      | Intrinsic px height                        |
| `alt`     | yes      | Description for screen readers             |
| `caption` | no       | Rendered below the frame; markdown allowed |

`width`/`height` must match the encode — they reserve the box so the page
doesn't shift when the video loads. Missing params fail the build via `errorf`.

---

## Behavior

- **Nothing is fetched until needed.** Sources carry `data-lv-src`, not `src`,
  so a reader who never scrolls to the video downloads zero video bytes.
- Preloads 300px before the frame enters the viewport, plays at 25% visibility,
  pauses when it leaves or the tab is hidden.
- Muted, looping, `playsinline`.
- **Clicking the picture toggles playback**, as any video player does, and
  Space or Enter do the same once it has focus — a click focuses it, so
  click-then-space works. Space is only swallowed while the video holds focus;
  everywhere else on the page it still scrolls. The control bar is layered
  above the video, so clicks on it don't reach through and double-toggle.
- **Scrub bar** — play/pause, elapsed time, then played-over-buffered progress.
  Fades in on hover or keyboard focus; stays visible while paused. Always
  visible on touch (no hover there).
- Track is a `role="slider"` with `aria-valuetext`, arrow/Home/End keys, and
  drag scrubbing.
- `prefers-reduced-motion` readers get the poster and a play button — no
  autoplay.

---

## Decisions & gotchas

- **Call the shortcode on ONE line in markdown.** `trunk fmt` runs prettier over
  `content/`, which reflows a multi-line shortcode call and reads the closing
  `>}}` as a blockquote. The next build dies with
  `unrecognized character in shortcode action: U+003E '>'` — and it kills a
  running `hugo serve`. Prettier uses `proseWrap: preserve` here, so one long
  line is safe.
- **Always rebuild _after_ `trunk fmt`, not before.** Formatting can silently
  break Hugo template syntax; the CLI build is the only thing that catches it.
- **`data-lv-src`, never `data-src`.** `scripts.html` runs
  `deferimg("img[data-src],picture,video:not(.loop-video__el),audio")`.
  Defer.js's reveal copies `data-*` to properties **and calls `.load()`** on
  anything it touches, which would restart playback. The `:not()` is the opt-out
  — keep it if you edit that line.
- **H.264 MP4 only — don't add a WebM.** VP9/WebM encodes ~15% smaller, but
  support isn't broad enough to justify a second asset in the repo and a second
  thing to keep in sync. H.264 plays everywhere.
- **The poster is NOT lazy.** It's fetched on page load regardless of scroll
  position (~135 KB); `preload="none"` governs media data only, and there is no
  lazy equivalent for the `poster` attribute. Keep posters small, or move the
  attribute to `data-lv-poster` and set it in `load()` if it starts to matter.
- **Font Awesome's JS build replaces every `<i>` with an `<svg>`.** Never
  `querySelector("i")` to swap an icon — it returns null after FA runs. Render
  both glyphs in wrapper spans you own and toggle them with CSS (the play/pause
  button does this).
