# mancha

`mancha` is an HTML templating library. It can work as a command-line tool, imported as a Javascript
function, or as a `Gulp 4+` plugin.

## Examples

Here are some of the things you can use `mancha` for.

### Replace simple variables using `{{value}}` format

Source:

```js
import * as Mancha from "mancha";
const content = "<div>Hello {{user}}</div>";
const output = Mancha.renderContent(content, { user: "World" });
console.log(output);
```

Result:

```html
<div>Hello World</div>
```

The first argument is a string of content to preprocess, the second is a dictionary of
`<key, value>` pairs such that instances of `{{key}}` in the content will be replaced with `value`.

### Include files from other local sources using the `<include>` tag

hello-world.html:

```html
<span>Hello World</span>
```

Source:

```html
<div>
  <include src="./hello-world.html"></include>
</div>
<script src="//unpkg.com/mancha" init></script>
```

Result:

```html
<div><span>Hello World</span></div>
```

## Use `mancha` in gulpfile scripts

To use `mancha` in your gulpfile, you can do the following:

```js
const mancha = require('mancha');
gulp.src(...).pipe(mancha({myvar: myval})).pipe(...)
```

The first argument consists of a dictionary of `<key, value>` pairs of literal string replacements.
`key` will become `{{key}}` before replacing it with `value` in the processed files. For example,
if we passed `{name: "Batman"}` as the argument:

Source:

```html
<div>Hello {{name}}</div>
```

Result:

```html
<div>Hello Batman</div>
```
