# Initialization

This document covers the different ways to initialize mancha and configure its behavior.

## Choosing the Right Approach

Mancha offers three initialization methods. Use this decision guide to choose the right one:

| Method | Use When | Complexity |
|--------|----------|------------|
| **Script Tag** | Simple projects, prototypes, single-page apps with no build step | Lowest |
| **ES Module (`initMancha`)** | Projects with bundlers, need for initial state, custom initialization logic | Medium |
| **`:render` Attribute** | Initializing specific elements (charts, maps, etc.) within an already-mounted page | Element-level |

### Decision Flowchart

```
START: Do you have a build step (bundler/TypeScript)?
  │
  ├─ NO → Use Script Tag with `init` attribute
  │         <script src="//unpkg.com/mancha" css="utils" init></script>
  │
  └─ YES → Are you initializing the whole page or specific elements?
            │
            ├─ WHOLE PAGE → Use ES Module with `initMancha`
            │                 import { initMancha } from "mancha/browser";
            │                 await initMancha({ target: "#app" });
            │
            └─ SPECIFIC ELEMENTS → Use `:render` attribute on those elements
                                    <canvas :render="./chart-init.js"></canvas>
```

### Quick Reference

**Script Tag** (simplest, no build step):
```html
<script src="//unpkg.com/mancha" css="utils" init></script>
```

**ES Module** (bundlers, TypeScript, custom init):
```typescript
import { initMancha } from "mancha/browser";
await initMancha({ target: "#app", state: { count: 0 } });
```

**`:render` Attribute** (element-level initialization):
```html
<canvas :render="./chart-init.js"></canvas>
```

> [!TIP]
> **For AI agents**: Start with the Script Tag approach for simple tasks. Use ES Module when you need to set initial state programmatically or have a build step. Use `:render` only for third-party library integration on specific elements (charts, maps, video players).

---

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

## Element-Level Initialization with `:render`

The `:render` attribute provides element-level initialization by linking an HTML element to a JavaScript ES module. This is useful for initializing third-party libraries (charts, maps, video players) on specific elements.

```html
<canvas :render="./chart-init.js"></canvas>
```

The module's default export is called with the element and renderer:

```js
// chart-init.js
export default function (elem, renderer) {
  new Chart(elem, { type: "bar", data: { labels: ["A", "B"], datasets: [{ data: [1, 2] }] } });
}
```

### When to Use `:render`

| Use `:render` When | Don't Use `:render` When |
|--------------------|--------------------------|
| Integrating third-party libraries (Chart.js, Leaflet, etc.) | Initializing the entire page |
| Element needs imperative JavaScript setup | Simple reactive data binding suffices |
| Canvas, video, or other media elements | Standard form inputs and displays |
| You need access to the DOM element directly | Pure declarative templates work |

### Key Characteristics

- **Runs after mount**: The init function executes after mancha has mounted the element
- **SSR compatible**: During server-side rendering, the path is resolved but the module is not executed
- **Relative paths**: Paths are resolved relative to the template file, not the HTML page
- **Reactive access**: The init function receives the renderer instance for reactive state access

For complete documentation on `:render` including reactive state access and custom components, see [Components & Preprocessing](./04_components.md#initialization-with-render).

## Combining Initialization Methods

You can combine the Script Tag or ES Module approach with `:render` attributes:

**Script Tag + `:render`** (most common for simple projects):
```html
<head>
  <script src="//unpkg.com/mancha" css="utils" init></script>
</head>
<body>
  <h1>Dashboard</h1>
  <!-- :render initializes this specific element after page mount -->
  <canvas :render="./sales-chart.js"></canvas>
</body>
```

**ES Module + `:render`** (for projects with bundlers):
```typescript
import { initMancha } from "mancha/browser";

await initMancha({
  target: "#app",
  state: { salesData: await fetchSalesData() },
});

// The :render attributes in #app will execute after mount
```

```html
<div id="app">
  <canvas :render="./chart.js"></canvas>
</div>
```

> [!NOTE]
> `:render` scripts execute after `initMancha` or the script tag has mounted the page. They are not a replacement for page-level initialization, but a complement for element-specific setup.

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

## Summary: Initialization at a Glance

This table summarizes all initialization methods and when to use them:

| Method | Syntax | Use Case | FOUC Prevention | Build Step Required |
|--------|--------|----------|-----------------|---------------------|
| **Script Tag** | `<script src="//unpkg.com/mancha" init>` | Simple projects, prototypes | Automatic | No |
| **ES Module** | `initMancha({ target: "#app" })` | Bundled projects, custom init logic | Manual (add cloak style) | Yes |
| **`:render`** | `<canvas :render="./init.js">` | Third-party library integration | N/A (runs after mount) | No |
| **Manual** | `new Renderer(); renderer.mount(el)` | Full control, advanced use cases | Manual | Yes |

### For AI Agents: Quick Decision Guide

1. **No build step?** → Use Script Tag with `init`
2. **Have a bundler (Vite, Webpack, etc.)?** → Use ES Module with `initMancha`
3. **Need to initialize a specific element (chart, map)?** → Use `:render` on that element
4. **Need both page init AND element init?** → Combine Script Tag or ES Module with `:render`

### Minimal Working Examples

**Simplest possible (Script Tag)**:
```html
<!DOCTYPE html>
<html>
<head>
  <script src="//unpkg.com/mancha" css="utils" init></script>
</head>
<body :data="{ count: 0 }">
  <button :on:click="count++">Count: {{ count }}</button>
</body>
</html>
```

**With bundler (ES Module)**:
```html
<!DOCTYPE html>
<html>
<head>
  <style id="mancha-cloak">body { opacity: 0 !important; }</style>
</head>
<body>
  <div id="app" :data="{ count: 0 }">
    <button :on:click="count++">Count: {{ count }}</button>
  </div>
  <script type="module">
    import { initMancha } from "mancha/browser";
    await initMancha({ target: "#app", cloak: true });
  </script>
</body>
</html>
```

**With third-party chart (Script Tag + `:render`)**:
```html
<!DOCTYPE html>
<html>
<head>
  <script src="//unpkg.com/mancha" css="utils" init></script>
  <script src="//unpkg.com/chart.js"></script>
</head>
<body>
  <h1>Sales Dashboard</h1>
  <canvas :render="./sales-chart.js"></canvas>
</body>
</html>
```
