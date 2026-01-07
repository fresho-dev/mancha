# Initialization

This document covers the different ways to initialize mancha and configure its behavior.

## Script Tag

The simplest way to use mancha is via a script tag with the `init` attribute:

```html
<script src="//unpkg.com/mancha" css="utils" init></script>
```

### Script Tag Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `init` | Enables automatic initialization on page load | `init` |
| `target` | CSS selector(s) to mount to (default: `body`). Use `+` to separate multiple targets | `target="main"` or `target="#app+#sidebar"` |
| `css` | CSS bundles to inject. Use `+` to separate multiple | `css="utils"` or `css="basic+utils"` |
| `debug` | Enable debug logging | `debug` |
| `cache` | Fetch cache policy for includes | `cache="no-cache"` |
| `cloak` | Control FOUC prevention (see below) | `cloak="200"` or `cloak="false"` |

## ES Module API

For more control, use the `initMancha` function:

```typescript
import { initMancha } from "mancha/browser";

const renderer = await initMancha({
  target: "#app",
  css: ["utils"],
  state: { message: "Hello" },
});
```

### InitManchaOptions

| Option | Type | Description |
|--------|------|-------------|
| `renderer` | `Renderer` | Use an existing Renderer instance instead of creating a new one |
| `target` | `string \| string[]` | CSS selector(s) to mount to |
| `css` | `CssName[]` | CSS bundles to inject: `"minimal"`, `"basic"`, `"utils"` |
| `state` | `Record<string, unknown>` | Initial state to set before mounting |
| `debug` | `boolean` | Enable debug logging |
| `cache` | `RequestCache` | Fetch cache policy for includes |
| `cloak` | `boolean \| CloakOptions` | FOUC prevention (see below) |
| `callback` | `Function` | Custom initialization callback (see below) |

## Cloaking (FOUC Prevention)

Cloaking hides your content until rendering is complete, preventing users from seeing raw template syntax like `{{ variable }}` or `:text="expr"` before JavaScript processes them.

### How It Works

Cloaking injects a global `<style>` tag that sets `opacity: 0 !important` for target elements immediately. Once rendering is complete, this style rule is updated to `opacity: 1` to trigger a smooth fade-in transition (if configured) before being removed. This ensures content is hidden instantly, preventing any FOUC.

### Script Tag Defaults

Cloaking is **enabled by default** when using the script tag with `init`:

```html
<!-- Cloaking ON by default (instant reveal) -->
<script src="//unpkg.com/mancha" css="utils" init></script>

<!-- Cloaking with 200ms fade-in animation -->
<script src="//unpkg.com/mancha" css="utils" init cloak="200"></script>

<!-- Disable cloaking (not recommended) -->
<script src="//unpkg.com/mancha" css="utils" init cloak="false"></script>
```

### ESM Defaults

Cloaking is **opt-in** when using the ES module API:

```typescript
import { initMancha } from "mancha/browser";

// No cloaking (default)
await initMancha({ target: "#app" });

// Enable with instant reveal
await initMancha({ target: "#app", cloak: true });

// Enable with 200ms fade-in
await initMancha({ target: "#app", cloak: { duration: 200 } });

// Cloak a different element than the mount target
await initMancha({
  target: "#app",
  cloak: { selector: "#loading-container", duration: 150 },
});
```

### CloakOptions

| Option | Type | Description |
|--------|------|-------------|
| `duration` | `number` | Fade-in animation duration in ms. Defaults to 0 (instant) |
| `selector` | `string \| string[]` | Element(s) to cloak. Defaults to `target` or `body` |

### Preventing FOUC with ESM

> [!WARNING]
> Because `<script type="module">` is deferred by default, using `initMancha` with `cloak` options may still result in a Flash of Unstyled Content (FOUC) because the script runs *after* the page has first rendered.

To guarantee zero FOUC when using ESM, you **must** manually add the cloak style to your `<head>`:

```html
<head>
  <!-- ... -->
  
  <!-- Pre-cloak the body (or your target element) to hide it immediately -->
  <style id="mancha-cloak">
    body { opacity: 0 !important; }
  </style>
</head>
```

When `initMancha({ cloak: ... })` runs, it will detect this existing style tag (by its ID `mancha-cloak`) and take control of it, applying any configured transitions and removing it once rendering is complete.

### Keeping Loading Indicator Active

To keep the browser's loading spinner active while `mancha` initializes (e.g., fetching data or waiting for cloaking animations), use a module script with top-level await:

```html
<script type="module">
  import { initMancha } from "//unpkg.com/mancha/browser?module";

  // The browser considers the page "loading" until this await resolves
  await initMancha({
    target: "#app",
    cloak: true,
    // ...
  });
</script>
```

### Custom Loading Indicators

During initialization (until `initMancha` resolves), `mancha` adds a `mancha-loading` class to the `<html>` element. You can use this class to display a custom loading indicator or overlay while your application is bootstrapping.

**Recipe: Full-screen loading overlay**

```css
/* Hide the loader by default */
.loader {
  display: none;
}

/* Show the loader only while mancha is loading */
html.mancha-loading .loader {
  display: flex;
  position: fixed;
  inset: 0;
  background: white;
  z-index: 9999;
  justify-content: center;
  align-items: center;
}
```

```html
<body>
  <div class="loader">Loading...</div>
  <div id="app">...</div>
</body>
```

This works perfectly with cloaking: `mancha-loading` is removed *immediately before* the cloaking fade-in animation starts, ensuring a seamless transition from your custom loader to the rendered app.

## Custom Initialization Callback

For advanced use cases, provide a `callback` function. When used, automatic mounting is skipped—you must call `renderer.mount()` yourself:

```typescript
import { initMancha } from "mancha/browser";

await initMancha({
  cloak: { duration: 150 },
  callback: async (renderer) => {
    // Fetch data before mounting
    const data = await fetch("/api/data").then((r) => r.json());
    await renderer.set("items", data.items);

    // Mount to the DOM
    await renderer.mount(document.getElementById("app"));
  },
});
```

The callback receives:
- `renderer`: The initialized Renderer instance

The callback receives:
- `renderer`: The initialized Renderer instance

## Advanced: Manual Initialization

> [!CAUTION]
> This is an advanced API. Most users should prefer `initMancha` which handles CSS injection, state initialization, and FOUC prevention automatically.

If you need full control without `initMancha`, you can use the lower-level API directly:

```typescript
import { Renderer, injectCss } from "mancha/browser";

// 1. Inject CSS utilities (optional)
injectCss(["utils"]);

// 2. Create renderer
const renderer = new Renderer();

// 3. Set state
await renderer.set("name", "World");

// 4. Mount to DOM
await renderer.mount(document.body);
```
