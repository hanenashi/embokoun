# Embokoun media strategy notes

Notes gathered from Vidokoun testing and early Embokoun design.

## 1. Animated GIF handling

Okoun pages may contain animated GIFs directly or as linked/embedded media. These can be heavy and visually noisy.

Goal: optional GIF replacement mode.

When enabled:

1. Detect shown animated GIFs.
2. Replace or overlay them with a static placeholder/screen.
3. On click, load the GIF deliberately.
4. Prefer controlled blob loading when possible:
   - use existing blob size limit
   - use existing active blob cleanup queue
   - expose Cancel while downloading
5. Display the result only after successful load.

Open design questions:

- Detect animation cheaply without fully decoding the file?
- Should direct GIFs be treated like Direct MP4 service or as a separate `gif` service?
- Should the placeholder use first frame, generic static panel, or original dimensions only?
- Should GIF playback support loop limits?

Potential settings:

```text
Animated GIF handling:
  - Leave alone
  - Replace with click-to-load placeholder
  - Blob-load before display

GIF loop mode:
  - Browser default
  - Once
  - N loops
  - Manual replay only
```

Loop control for true GIF files is awkward in normal browser `<img>` playback. For strict loop control, Embokoun may need to convert GIF into video/canvas playback or use a library. That is heavier, so default should stay simple.

## 2. Telegram reality check

Telegram links from real Okoun threads may not point directly to a video.

Common cases:

```text
- Telegram post contains a video
- Telegram post contains images
- Telegram post contains text only
- Telegram post contains mixed text + images + video
- Telegram post page blocks or hides raw media URL
```

The service needs a two-path system:

```text
Telegram URL
  -> fetch public page HTML
  -> try to find video/media URL
       -> found video: blob-load it, display native player
       -> found image: display image/card, maybe future gallery handling
       -> no usable media: fallback iframe/card for original Telegram post
```

The fallback iframe is not a failure. For Telegram post pages with text/images/context, an iframe may be the best representation.

## 3. Universal service result model

Services should not only return one final DOM node blindly. They should return a normalized result so the core can make consistent decisions.

Proposed internal result shape:

```javascript
{
  kind: 'video-url' | 'image-url' | 'iframe' | 'native-node' | 'none',
  url: 'https://...',
  node: HTMLElement,
  fallbackUrl: 'https://...',
  aspect: '16/9',
  widthMode: 'normal' | 'wide',
  reason: 'found-mp4' | 'no-media-found' | 'blocked' | 'text-post'
}
```

Then the core pipeline can do:

```text
service.resolve(url)
  -> result.kind === video-url
       -> controlled blob loader
       -> native video display
  -> result.kind === image-url
       -> controlled image loader / image display
  -> result.kind === iframe
       -> sane iframe display
  -> result.kind === native-node
       -> insert node
  -> result.kind === none
       -> leave original link alone or show fallback link
```

## 4. Universal fallback iframe/card helper

Each service can provide a service-specific fallback URL, but the display rules should be shared.

Needed core helper:

```javascript
Embokoun.ui.fallbackFrame({
  src,
  service,
  originalUrl,
  mode: 'normal' | 'wide' | 'tall',
  reason
})
```

Potential display modes:

```text
normal: max-width 550px, 16:9-ish
wide:   larger max-width, useful for Telegram pages
post:   taller iframe for mixed text/media posts
tall:   Instagram-like vertical content
```

## 5. Wide iframe option

Telegram in particular may benefit from wider/taller iframe display.

Potential setting:

```text
Fallback iframe width:
  - Normal
  - Wide
  - Full content width
```

Or per-service:

```text
Telegram fallback mode:
  - Compact
  - Wide
  - Tall post card
```

This should be implemented as a core UI setting, not hardcoded into Telegram only.

## 6. Heavy logging needs

For service leech cores, logs should make the decision path obvious:

```text
[embokoun:telegram] resolving post URL
[embokoun:telegram] fetched HTML, length=123456
[embokoun:telegram] found candidate video URL
[embokoun:telegram] blob download started, limit=80 MB
[embokoun:telegram] blob success, size=12.4 MB
```

And for fallback cases:

```text
[embokoun:telegram] no video URL found; using iframe fallback
[embokoun:telegram] fallback reason=no-media-found
```

## 7. Suggested implementation order

1. Add universal `resolve -> render` pipeline.
2. Add fallback iframe/card helper with width modes.
3. Port Telegram using the new result model.
4. Add GIF service in conservative mode: click-to-load placeholder first.
5. Add cancel/progress panel to blob core.
6. Add wider/taller iframe settings.
7. Only then port Instagram/Facebook, because they are swamp goblins.
