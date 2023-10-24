# mancha

`mancha` is an HTML templating library designed to be used as a `Gulp 4+` plugin, although it
can also be used on its own. In essence, it is a stream transformer that can be used for simple but
powerful server-side, compile-time rendering.

## Examples

Here are some of the things you can use `mancha` for.

### Replace simple variables using `{{value}}` format

Source:

```js
import mancha from "mancha";
const content = "<div>Hello {{user}}</div>";
const output = mancha.render(content, { user: "World" });
console.log(output);
```

Result:

```html
<div>Hello World</div>
```

### Include files from other local sources using the `<include>` tag

hello-world.html:

```html
Hello World
```

Source:

```html
<div>
  <include src="./hello-world.html"></include>
</div>
```

Result:

```html
<div>Hello World</div>
```

## Usage

To use `mancha` in your gulpfile, you can do the following:

```js
const mancha = require('gulp-mancha');
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

`mancha` also accepts a second optional argument which will be the `context`. This way, you can pass
complex objects or even libraries to be used within your rendered Javascript.
