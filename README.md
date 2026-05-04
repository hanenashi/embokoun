<p align="center">
  <img src="embokoun.png" alt="embokoun obsidian media shrine icon" width="220">
</p>

# embokoun

Embokoun is a modular userscript for embedding media links on okoun.cz.

It is the successor to `vidokoun`: the old single-script idea has been split into a small loader, shared core modules, and one service module per media host.

## Install

Install the userscript loader:

[https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js](https://raw.githubusercontent.com/hanenashi/embokoun/main/embokoun.user.js)

The loader uses userscript `@require` entries to load the modules from `src/`.

## Current Status

Current version: `0.5.2`

Embokoun is still alpha, but the current shape is usable and modular:

- thin `embokoun.user.js` loader
- classic `@require` module loading for userscript-manager compatibility
- Tampermonkey / Kiwi support through `GM_xmlhttpRequest`
- Greasemonkey 4+ support through `GM.xmlHttpRequest`
- userscript menu entry through `GM_registerMenuCommand` / `GM.registerMenuCommand`
- shared global namespace at `window.Embokoun`
- modular service registry
- universal `resolve -> render` pipeline
- backward-compatible old `embed(ctx)` service support
- universal iframe fallback helper
- blob video loading with progress, cancel, size limits, and cleanup
- placeholder rendering with optional thumbnails
- per-service enable and auto-load settings
- localStorage-backed settings panel
- Okoun DOM scanner with MutationObserver support
- source/original-link visibility control
- userscript icon from `icon.ico`
- settings/README icon from `embokoun.png`

## Supported Services

Current service modules:

- Direct MP4 links
- YouTube
- Vimeo
- Twitter/X
- Telegram
- Instagram
- Facebook
- TikTok
- Suno

Current link matching:

```text
Direct MP4    https://.../*.mp4
YouTube       youtube.com/watch, youtube.com/embed, youtube.com/live, youtube.com/shorts, youtu.be
Vimeo         vimeo.com/... numeric video IDs
Twitter/X     twitter.com/.../status/... and x.com/.../status/...
Telegram      t.me/channel/123, t.me/s/channel/123, telegram.me/channel/123
Instagram     instagram.com/reel/..., /p/..., /tv/...
Facebook      facebook.com links and fb.watch links
TikTok        tiktok.com/@user/video/...
Suno          suno.com/song/<uuid>
```

## Settings

Open settings from the userscript manager menu:

```text
Embokoun settings
```

Settings are also available from the small `settings` button injected into placeholders and rendered media.

Current settings panel:

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

GitHub
Reset
Close
```

Defaults:

```javascript
{
  logLevel: 'info',
  blobMaxMb: 80,
  blobMaxActive: 3,
  showSourceLinks: false,
  placeholderMode: 'line',
  placeholderThumbs: true,
  autoLoadServices: {},
  enabledServices: {}
}
```

Setting choices:

- log level: `off / error / warn / info / debug / trace`
- show original links: show or hide the original Okoun inline link and extra source link
- placeholder mode: `line` or `tombstone`
- fetch thumbnails: enable or disable placeholder previews
- blob size limit: `No limit / 25 / 50 / 80 / 120 / 200 MB`
- loaded blob videos: `1 / 2 / 3 / 5`
- services: per-service `On` and `Auto` toggles
- reset: restore defaults

Settings are stored in:

```javascript
localStorage['embokoun.settings.v1']
```

## Placeholder Thumbnails

When thumbnail previews are enabled, services can provide a `placeholderImage(ctx)` function. The UI accepts either a direct URL or a promise resolving to a URL.

Current thumbnail behavior:

- YouTube tries `i.ytimg.com` / `img.youtube.com` thumbnail candidates and converts the winning image to a local blob URL.
- Twitter/X uses vxtwitter metadata and blob-fetches the thumbnail/poster image.
- Telegram parses the public embed page, blob-fetches media thumbnails, or generates a text preview for text-only posts.
- Instagram uses public metadata when available, otherwise it generates an unavailable preview card.
- Facebook uses public metadata when available, otherwise it generates an unavailable preview card.

## Blob Loading

Blob-loaded videos use userscript HTTP requests instead of normal page media loading:

```text
GM_xmlhttpRequest / GM.xmlHttpRequest
-> Blob
-> URL.createObjectURL(...)
-> local <video controls>
```

Blob UI provides:

- progress text
- configured size limit enforcement
- cancel button
- active blob cleanup
- page unload cleanup

The default blob limit is `80 MB`, and the default active blob video limit is `3`.

## Service Behavior

YouTube, Vimeo, TikTok, and Suno currently render as iframes.

Twitter/X resolves tweet metadata through vxtwitter. If an MP4 is available, Embokoun blob-loads it; otherwise it falls back to the Twitter embed iframe.

Telegram resolves public posts through:

```text
https://t.me/channel/12345?embed=1&mode=tme
```

Telegram then prefers:

```text
1. pure single video post -> blob video
2. mixed video/photo/text post -> native Telegram card
3. photo/text post -> native Telegram card
4. text-only post -> native Telegram card
5. unsupported post -> iframe fallback
```

Instagram support is best-effort. Embokoun tries to fetch public post/reel pages, extract direct video or metadata, and render either a video or native card. Login-walled, age-limited, or otherwise unavailable posts become clean fallback cards.

Facebook support is also best-effort. Embokoun matches Facebook and `fb.watch` links, tries public metadata extraction, blob-loads a direct MP4 when one is found, and otherwise renders a fallback card.

## Architecture

Every module attaches to:

```javascript
window.Embokoun
```

Services register themselves through:

```javascript
Embokoun.services.register({ ... })
```

Compatibility service shape:

```javascript
{
  key: 'legacy-service',
  label: 'Legacy Service',
  match(url) {},
  embed(ctx) {},
  fallback(ctx) {}
}
```

Preferred service shape:

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

There is no build step, no ES module loader, and no runtime code evaluation. The repository ships plain userscript-compatible JavaScript files.

## File Layout

```text
embokoun.user.js
icon.ico
embokoun.png
README.md
docs/media-strategy-notes.md
src/core/namespace.js
src/core/gm.js
src/core/config.js
src/core/log.js
src/core/ui.js
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
src/services/tiktok.js
src/services/suno.js
src/services/index.js
```

## Logging

The settings panel exposes:

```text
off / error / warn / info / debug / trace
```

Logs are prefixed by area:

```text
[embokoun:dom]
[embokoun:ui]
[embokoun:blob]
[embokoun:youtube]
[embokoun:vimeo]
[embokoun:direct-mp4]
[embokoun:twitter]
[embokoun:telegram]
[embokoun:instagram]
[embokoun:facebook]
[embokoun:tiktok]
[embokoun:suno]
```

## Development Notes

When adding a service:

1. Add a file under `src/services/`.
2. Register it with `Embokoun.services.register(...)`.
3. Add the file to `embokoun.user.js` as an `@require`.
4. Keep host-specific scraping or fallback logic inside that service module.
5. Update this README when behavior or service coverage changes.

When releasing a new version, update both:

```javascript
// embokoun.user.js
// @version ...
E.version = '...'

// src/core/namespace.js
root.version = root.version || '...'
```

## Design Rule

Each service owns its own host-specific logic. If one host breaks, the shared renderer and the other services should keep working.

Deeper architecture notes live in [docs/media-strategy-notes.md](docs/media-strategy-notes.md).
