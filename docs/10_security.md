# Security

`mancha` templates are code, not data. A directive is an expression that the renderer evaluates, so
rendering a template is equivalent to running the JavaScript in it. There is no mode that changes
this: `mancha` does not attempt to contain a hostile template, and it does not ship a sanitizer.

The boundary is therefore the source of the template, not the content of the template:

- **Safe**: render templates you wrote, or that came from your repository, your build, or an author
  you would give commit access to.
- **Unsafe**: render a template supplied by a user, pulled from a database of user content, or
  fetched from a host you do not control.

Values are different from templates. Data you put in the store (a name, a search query, an API
response) is data, and the text sinks escape it. The rest of this page describes exactly which sinks
do that, and what a template can reach when you render one.

## Templates Are Programs

Every one of these evaluates its value as an expression against the renderer's scope:

| Directive                              | When it evaluates                            |
| -------------------------------------- | -------------------------------------------- |
| `:data`                                | At mount, and again on keyed `:for` reuse    |
| `:text`, `:html`, `:class`, `:show`, `:if` | At mount, and whenever a dependency changes |
| `:for`, `:key`, `:bind`                | At mount, and whenever a dependency changes  |
| `:attr:{name}`, `:prop:{name}`         | At mount, and whenever a dependency changes  |
| `:on:{event}`                          | Every time the event fires                   |
| `{{ ... }}` in a text node             | At mount, and whenever a dependency changes  |

The `data-` forms (`data-text`, `data-on-click`, ...) are the same directives and behave
identically.

Three of them do more than evaluate an expression:

- `<include src="...">` and `<link rel="subresource" href="...">` fetch another document and
  preprocess it with the same renderer. The included file's directives run with the same scope and
  privileges as the page that included it. Nesting is bounded only by `maxdepth` (default 10), which
  raises `Maximum recursion depth reached`.
- `:render="./module.js"` imports that module and calls its default export. Importing runs the
  module's top-level code.
- `<template is="...">` registers a custom tag. Registration is **first-wins** and the registry is
  shared by reference with every subrenderer, so a fragment rendered early can claim a tag name that
  the rest of the application has not defined yet, and later definitions of that name are ignored.

### The expression scope includes the globals

Expressions are parsed by an expression parser rather than `eval()`, but that is a Content Security
Policy accommodation, not a sandbox. The scope proxy resolves a name against the local arguments,
then the store, then `globalThis`, so every global is in scope:

```html
<!-- Reads the document's cookies. -->
<div :text="document.cookie"></div>

<!-- Reads local storage. -->
<div :text="localStorage.getItem('token')"></div>

<!-- On the server, reads the process environment. -->
<div :text="process.env.DATABASE_URL"></div>
```

Because ordinary objects are in scope too, `.constructor.constructor` reaches `Function`, and a
single-expression language becomes an arbitrary-statement one:

```html
<!-- Runs at mount. -->
<div :text="({}).constructor.constructor('/* any code at all */')()"></div>
```

Anything you can do in a `<script>` tag on the page, a template you render can do. Rendering a
template is the same grant as adding a script tag to the page.

## Escaping, Sink By Sink

Escaping applies to the **values** flowing through a template you control, and it is real. Given a
value of `<img src=x onerror="...">`:

| Sink                        | Result                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| `:text`                     | Escaped. Set as `textContent`; no element is created (see below)  |
| `{{ ... }}`                 | Escaped. Set as text node content; no element is created          |
| `:html`                     | Parsed as HTML. The element is created and its `onerror` fires    |
| `:attr:{name}`              | Written verbatim, including `javascript:` URLs and `on*` handlers |
| `:prop:{name}`              | Assigned to the property directly, with no URL check              |

`:html` goes further than parsing: the resulting fragment is rendered as a `mancha` template by a
subrenderer, so directives inside it execute, and in the browser a `<script>` element in that string
runs when it is inserted.

`:text` escapes markup, but it has one edge worth knowing: the text it writes **during mount** is
still visited by the text-node plugin afterwards, so a value that itself contains `{{ ... }}` is
evaluated as an expression. Values written by `:text` after mount are not rescanned, and neither is
the result of a `{{ ... }}` substitution. Prefer `{{ ... }}` for values whose content you do not
control. This is a bug rather than intended behavior, tracked as
[#104](https://github.com/fresho-dev/mancha/issues/104); this paragraph goes away when it is fixed.

So a value is safe in `{{ ... }}` and, with that caveat, in `:text`; it is unsafe everywhere else.
This matters most for the values you do not choose yourself:

```html
<!-- Safe: URL query parameters, form input and API responses are escaped here,
     and the substituted text is not evaluated. -->
<p>Results for {{ $$search }}</p>

<!-- Unsafe: the same value is markup here, and executes. -->
<div :html="$$search"></div>

<!-- Unsafe: an attacker-controlled `javascript:` URL is written through unchanged. -->
<a :attr:href="$$next">Continue</a>
```

The rule of thumb: untrusted values may only reach `{{ ... }}`, and `:text` subject to the note
above. If you need untrusted markup, see
[Isolating Untrusted Content](#isolating-untrusted-content).

## Whatever You Mount Is A Template

Mounting is what turns markup into a program, and it applies to everything under the mount point.
The script tag form (`<script src="//unpkg.com/mancha" init>`) mounts `body` by default, so any
content your server wrote into the page is a template, whether you meant it to be one or not.

HTML-escaping does not help here, because `{{ ... }}` is ordinary text and survives escaping intact:

```html
<!-- A comment stored as: {{ (0).constructor.constructor('...')() }} -->
<!-- Escaped correctly by the server, and still evaluated at mount. -->
<p>{{ (0).constructor.constructor('...')() }}</p>
```

Escaping does stop the attribute forms — an escaped `"` cannot open a `:text` attribute — but the
text-node form needs no attribute at all. If a page carries content from your users, deliver it as a
store value rendered by `{{ ... }}`, write it into the DOM yourself after mount, or keep it outside
the mounted subtree.

## Isolating Untrusted Content

If you have to display content you do not control, keep it out of the renderer.

**Sandboxed iframe.** `mancha` needs `allow-scripts` to run at all, and the sandbox only helps if
the frame cannot reach back into your page:

```html
<!-- The frame runs, but cannot touch this document. -->
<iframe src="/untrusted" sandbox="allow-scripts"></iframe>

<!-- Do not do this: the two tokens together give the frame full access to the parent DOM. -->
<iframe src="/untrusted" sandbox="allow-scripts allow-same-origin"></iframe>
```

Never combine `allow-scripts` with `allow-same-origin` for content served from your own origin. If
the frame genuinely needs a same-origin document of its own, serve it from a different origin
instead, so the origin — not the sandbox attribute — is what separates it from your page.

**Render to inert HTML.** Render trusted templates on the server and send the result to the client
without loading `mancha` there. The output is plain HTML with no directives left in it, so the
client never evaluates anything. This works because the template being rendered is yours; it is not
a way to defuse a hostile template, which would still execute on the server (see below).

## Server-Side Rendering

Rendering on the server ([SSR](./06_ssr.md)) moves expression evaluation into your server process,
where the ambient scope is Node's rather than the browser's:

- Expressions can read `process`, and anything else on `globalThis` in that process.
- `<include>` resolves through `fetchLocal`, which reads from the filesystem. An absolute `src`
  reads that path directly, so `<include src="/etc/passwd">` is a file read, not a template error.
- `:render` imports the module at that path and executes it.

Two consequences:

1. **Never assemble a template from request data.** Pass request data as store values, which is what
   the SSR examples do — `new Renderer({ name, ...vars })` — and keep the HTML itself fixed. A
   template string built by concatenating user input is a remote code execution bug, not an XSS bug.
2. **Never let a request choose the path you render or include.** `preprocessLocal(req.query.page)`
   lets the caller read any file the process can read.

## What The Library Does Protect

These are real, and worth knowing precisely because their scope is narrow:

- **`safevalues` at DOM sinks.** Attributes written by the renderer's own bookkeeping go through
  `safeElement.setPrefixedAttribute` with an allowlist of `:`, `style` and `class` prefixes;
  relative-path rebasing for `<a>` and `<area>` goes through `safeAnchorEl` / `safeAreaEl`, which
  drop `javascript:` URLs; injected stylesheets go through `safeStyleEl`. All of these operate on
  values the renderer derived from the template itself. **They do not sanitize `:attr:` or `:prop:`
  values**, which are set directly, as the table above shows.
- **`tsec` on the build.** `npm run build` type-checks with `tsec`, which bans unsafe DOM sinks
  (`innerHTML`, `eval`, and friends) in `mancha`'s own source, with a small set of reviewed
  exemptions. It constrains how the library is written; it says nothing about what a template does.
- **CSP compatibility, with a bonus.** Because expressions are parsed rather than `eval`-ed,
  `mancha` runs under a policy with no `'unsafe-eval'`. That same policy also blocks the
  `Function` escape described above: the expression fails and is logged as a failed evaluation. It
  does **not** stop the rest — property reads and method calls on globals such as `document.cookie`
  or `localStorage.getItem(...)` still work — so CSP narrows the blast radius of a hostile template
  without containing it.

## Summary

- Render templates only from sources you trust. A template can do whatever a script tag can do.
- Untrusted **values** are fine in `{{ ... }}` and `:text`, and only there.
- Untrusted **markup** belongs in a cross-origin or `allow-scripts`-only iframe, never in `:html`.
- On the server, a hostile template is code execution on your server, and `<include>` is a file
  read. Pass request data as store values, never as template text or template paths.
