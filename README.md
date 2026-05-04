<p align="center">
  <img src="embokoun.png" alt="embokoun obsidian media shrine icon" width="220">
</p>

# embokoun

Embokoun is the modular successor to `vidokoun`.

Goal: make Okoun media embedding maintainable, testable, and expandable without growing one cursed mega-userscript forever.

## Install

Install the loader userscript:

[https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js](https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js)

The loader pulls the individual modules from `src/` through userscript `@require` lines.

## Current status

`0.4.21-alpha`

Embokoun now has a modular service registry, universal `resolve -> render` layer, blob loading, thumbnail placeholders, per-service toggles, a consolidated settings panel, and a tiny obsidian media shrine icon because apparently branding happened.

Current features:

- thin `embokoun.user.js` loader
- classic `@require`-loaded modules for userscript-manager compatibility
- userscript icon wired through `icon.ico`
- settings panel header icon wired through `embokoun.png`
- Tampermonkey / Kiwi support through `GM_xmlhttpRequest`
- Greasemonkey 4+ support through `GM.xmlHttpRequest`
- userscript menu settings via `GM_registerMenuCommand` / `GM.registerMenuCommand`
- localStorage-backed settings
- consolidated settings panel with grouped sections
- compact service table: service / enabled / auto-load
- toggleable logging levels
- global placeholder mode: `line` or `tombstone`
- optional thumbnail fetching for placeholders
- optional original-link visibility
- configurable blob size limit and active blob cleanup limit
- cancelable blob download panel with progress text
- small settings button injected into media placeholders and loaded media/cards
- modular service registry
- universal `resolve -> render` core with backward-compatible old `embed()` support
- universal iframe helper
- Okoun DOM scanner and MutationObserver

Current services:

- Direct MP4
- YouTube, with blob-fetched thumbnail placeholders
- Vimeo
- Twitter/X, using vxtwitter metadata, blob-fetched thumbnails, blob-loaded MP4 path, progress/cancel, and iframe fallback
- Telegram, with blob-fetched thumbnails, generated text-only previews, native cards for text/photo/mixed posts, blob-loaded playable video tiles, and iframe fallback
- Instagram, with thumbnail previews, direct video extraction where possible, and graceful unavailable cards for login/age/account-gated posts
- Facebook, with metadata thumbnails, direct MP4 extraction where possible, and fallback cards for private/login-walled posts

This is still alpha, but it is no longer just a video goblin with a regex club.

## Settings

Open from the userscript manager menu:

```text
Embokoun settings
```

Also available from the small `settings` pill injected into media placeholders/cards.

Current settings panel layout:

```text
General
  Log level
  Show original links

Placeholders
  Mode
  Fetch thumbnails

Loading
  Blob size limit
  Loaded blob videos

Services
  Service | On | Auto
```

Setting details:

- log level: `off / error / warn / info / debug / trace`
- show original links:
  - ON: keep the original inline Okoun URL and show the extra `[ Open original ... link ]`
  - OFF: hide the original inline Okoun URL and hide the extra source link
- placeholder mode:
  - `line`: compact one-line load placeholder
  - `tombstone`: larger thumbnail/card-style placeholder
- fetch thumbnails: enable/disable placeholder previews
- blob size limit: `No limit / 25 / 50 / 80 / 120 / 200 MB`
- loaded blob videos: `1 / 2 / 3 / 5`
- per-service enable/disable
- per-service auto-load
- reset settings

Settings are stored in:

```javascript
localStorage['embokoun.settings.v1']
```

## Icon

The project icon is the **obsidian media shrine**:

```text
black obsidian tombstone / altar
large golden play button
tiny okoun statue on top
cute horroresque pixel-art-ish energy
```

Used files:

```text
icon.ico      userscript manager icon
embokoun.png  README/settings header icon
```

## Placeholder thumbnails

Embokoun tries to show useful placeholder previews before loading media.

For hostile/hotlink-sensitive hosts, thumbnails are fetched through userscript requests and converted to local blob URLs:

```text
GM_xmlhttpRequest / GM.xmlHttpRequest
↓
thumbnail Blob
↓
URL.createObjectURL(...)
↓
placeholder <img src="blob:...">
```

Current thumbnail behavior:

- YouTube: fetches `i.ytimg.com` / `img.youtube.com` candidates as blobs
- Twitter/X: uses vxtwitter metadata, then blob-fetches the thumbnail/poster image
- Telegram: parses the public embed page, then blob-fetches the first video thumbnail or image
- Telegram text-only posts: generates a local SVG preview card from author + first text lines
- Instagram: uses page metadata where available, otherwise generates an unavailable preview card
- Facebook: uses page metadata where available, otherwise generates an unavailable preview card

## Blob loading

Blob-loaded videos use userscript HTTP requests instead of normal page media loading:

```text
GM_xmlhttpRequest / GM.xmlHttpRequest
↓
Blob
↓
URL.createObjectURL(...)
↓
local <video controls>
```

This is useful for hosts that fail when loaded directly by the page because of CSP, hotlinking, referrer checks, or other tiny bureaucratic goblins.

Blob UI provides:

- live progress text
- size limit enforcement
- Cancel button
- active blob cleanup
- page unload cleanup

## Telegram behavior

Telegram links such as:

```text
https://t.me/channel/12345
https://t.me/s/channel/12345
```

are resolved through the public embed page:

```text
https://t.me/channel/12345?embed=1&mode=tme
```

Embokoun then tries this order:

```text
1. fetch Telegram embed HTML
2. parse media and text
3. pure single video post -> blob video
4. mixed video/photo/text post -> native Telegram card
5. photo/text post -> native Telegram card
6. text-only post -> native Telegram card, with generated placeholder preview
7. weird/unsupported post -> iframe fallback
```

Mixed Telegram posts keep the full card readable:

```text
Telegram card
├─ video tile -> click to blob-load local video
├─ photo tile(s)
├─ full text with links cleaned for Okoun
└─ footer actions: Video / Open
```

The video tile does **not** open the Telegram CDN directly. It uses the same blob download path as Twitter/X, so it avoids browser page CSP/media-src trouble where possible.

## Instagram behavior

Instagram support is best-effort.

Embokoun tries to:

```text
1. fetch public post/reel page
2. extract direct video URL if present
3. extract image/metadata if direct video is not present
4. render video or card
5. show a clean unavailable card when Instagram blocks the content
```

If Instagram says the post requires login, app access, account permission, or age/account limits, Embokoun does not try to defeat that. It shows a clean fallback card with `Open on Instagram`.

## Facebook behavior

Facebook support is also best-effort.

Embokoun tries to:

```text
1. match facebook.com / fb.watch links
2. fetch public page metadata
3. extract og:image / og:video / mp4-ish URLs
4. blob-load direct video if possible
5. otherwise show a clean Facebook card with Open on Facebook
```

Private, login-walled, or blocked Facebook posts may only render as fallback cards. Facebook is a swamp. Bring boots.

## Media strategy notes

Deeper design notes live here:

[docs/media-strategy-notes.md](docs/media-strategy-notes.md)

That document tracks the wider architecture plan:

- animated GIF handling: optional click-to-load replacement/overlay
- controlled blob loading with limits, cleanup, cancel, and progress UI
- Telegram post reality: video/image/text/mixed posts need sane fallback behavior
- universal `resolve -> render` service result model
- universal fallback iframe/card helper
- wider/taller iframe display modes
- logging requirements for service leech cores

Main idea: services resolve media intent first, then core rendering decides whether to blob-load video, show image/card, or use iframe fallback. Less soup. More skeleton.

## File layout

```text
embokoun.user.js
icon.ico
embokoun.png
src/core/namespace.js
src/core/gm.js
src/core/log.js
src/core/config.js
src/core/ui.js
src/core/icon.js
src/core/blob.js
src/core/shell.js
src/core/render.js
src/core/dom.js
src/services/direct-mp4.js
src/services/youtube.js
src/services/vimeo.js
src/services/twitter.js
src/services/telegram.js
src/services/instagram.js
src/services/facebook.js
src/services/index.js
docs/media-strategy-notes.md
```

## Architecture

Every module attaches to the global namespace:

```javascript
window.Embokoun
```

Every service registers itself through:

```javascript
Embokoun.services.register({ ... })
```

Current compatibility service shape still works:

```javascript
{
  key: 'legacy-service',
  label: 'Legacy Service',
  match(url) {},
  embed(ctx) {},
  fallback(ctx) {}
}
```

New preferred service shape:

```javascript
{
  key: 'direct-mp4',
  label: 'Direct MP4',
  match(url) {},
  placeholderImage(ctx) {
    return 'https://example.com/thumb.jpg';
  },
  async resolve(ctx) {
    return {
      kind: 'video-url',
      url: 'https://example.com/video.mp4',
      aspect: '16/9',
      reason: 'direct-mp4'
    };
  },
  fallback(ctx) {}
}
```

Supported render result kinds:

```text
video-url
image-url
iframe
native-node
none
```

No ES modules, no dynamic `eval`, no clever loader magic. Userscript managers are weird enough already.

## Logging

Settings menu exposes logging level:

```text
off / error / warn / info / debug / trace
```

Logs are prefixed like:

```text
[embokoun:dom]
[embokoun:ui]
[embokoun:blob]
[embokoun:youtube]
[embokoun:direct-mp4]
[embokoun:twitter]
[embokoun:telegram]
[embokoun:instagram]
[embokoun:facebook]
```

## Greasemonkey notes

Embokoun includes compatibility wrappers for both API styles:

```javascript
GM_xmlhttpRequest
GM.xmlHttpRequest
GM_registerMenuCommand
GM.registerMenuCommand
```

Remote modules are loaded through `@require`, which is safer and more compatible than fetching JS and evaluating it manually.

## Roadmap

Near-term polish:

- better per-service sizing controls
- GIF click-to-load strategy
- diagnostics panel / copied debug bundle
- more compact card modes
- more cursed hosts as encountered in the wild

## Design rule

Each service gets its own leech core.

If one service breaks, it should not turn the whole userscript into soup.
