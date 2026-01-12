# Syntax

`mancha` renders HTML by traversing every node in the DOM and applying a series of plugins. Each plugin is only applied if specific conditions are met such as the HTML element tag or attributes match a specific criteria.

## Attributes

- `:data` provides scoped variables to all subnodes, evaluated using `jexpr`. Use `$computed` for derived values that update automatically (see [Reactivity](./03_reactivity.md#computed-values)).
  ```html
  <div :data="{ name: 'Stranger' }"></div>
  <div :data="{ count: 1, doubled: $computed(() => count * 2) }"></div>
  ```
- `:for` clones the node and repeats it. The loop re-renders when the array is mutated (e.g., `push`, `pop`, `splice`, or `items.length = 0` to clear).
  ```html
  <div :for="item in ['a', 'b', 'c']">{{ item }}</div>
  ```
- `:text` sets the `textContent` value of a node
  ```html
  <div :data="{foo: 'bar'}" :text="foo"></div>
  ```
- `:html` sets the `innerHTML` value of a node
  ```html
  <div :html="<span>Hello World</span>"></div>
  ```
- `:show` toggles `$elem.style.display` to `none`
  ```html
  <div :data="{foo: false}" :show="foo"></div>
  ```
- `:if` conditionally renders the element (removes it from the DOM when false). **Note**: `:else` is not currently supported.
  ```html
  <div :data="{visible: true}" :if="visible">Content</div>
  ```
- `:class` appends rendered text to existing class attribute
  ```html
  <span :class="error ? 'red' : 'blue'" class="text-xl">...</span>
  ```
- `:bind` binds (two-way) a variable to the `value` or `checked` property of the element
  ```html
  <div :data="{ name: 'Stranger' }">
  	<input type="text" :bind="name" />
  </div>
  ```
- `:on:{event}` adds an event listener for `event` to the node
  ```html
  <button :on:click="console.log('clicked')"></button>
  ```
- `:on:{event}.prevent` calls `event.preventDefault()` in the event handler
  ```html
  <a href="#" :on:click.prevent="console.log('clicked')"></a>
  ```
- `:attr:{name}` sets the corresponding attribute for `name` in the node
  ```html
  <a :attr:href="buildUrl()"></a>
  ```
- `:prop:{name}` sets the corresponding property for (camel-case converted) `name` in the node
  ```html
  <video :prop:src="buildSrc()"></video>
  ```
- `{{ value }}` replaces `value` in text nodes
  ```html
  <button :data="{label: 'Click Me'}">{{ label }}</button>
  ```

## Evaluation

To avoid violation of Content Security Policy (CSP) that forbids the use of `eval()`, `mancha` evaluates all expressions using a safe expression parser. This means that only simple expressions are allowed, but it supports many modern JavaScript features, including optional chaining, the spread operator, and arrow functions. For example:

```html
<!-- Valid expression: string concatenation -->
<body :data="{ pos: 1 }">
	<p :text="'you are number ' + pos + ' in the queue'"></p>
</body>

<!-- Valid expression: optional chaining -->
<body :data="{ user: null }">
	<p :text="user?.name ?? 'Anonymous'"></p>
</body>

<!-- Valid expression: spread operator -->
<body :data="{ list: [1, 2], extra: 3 }">
	<div :for="item in [...list, extra]">{{ item }}</div>
</body>

<!-- Valid expression: arrow functions (e.g. in map) -->
<body :data="{ items: [1, 2, 3] }">
	<div :for="n in items.map((x) => x * 2)">{{ n }}</div>
</body>

<!-- Valid expression: boolean logic -->
<body :data="{ pos: 1, finished: false }">
	<p :show="pos >= 1 && !finished">you are number {{ pos }} in the queue</p>
</body>

<!-- Valid expression: ternary operators -->
<body :data="{ pos: 1 }">
	<p :text="pos % 2 == 0 ? 'even' : 'odd'"></p>
</body>

<!-- Valid expression: function calling -->
<body :data="{ pos : 1 }">
	<p :text="buildQueueMessage()"></p>
	<script>
		const { $ } = Mancha;
		$.buildQueueMessage = function () {
			return "you are number " + this.pos + " in the queue";
		};
		// Alternatively, anonymous functions without `this`:
		// $.buildQueueMessage = () => 'you are number ' + $.pos + ' in the queue';
	</script>
</body>

<!-- Valid expression: simple assignment -->
<body :data="{ pos: 1 }">
	<p :text="'you are number ' + pos + ' in the queue'"></p>
	<button :on:click="pos = pos + 1">Click to get there faster</button>
</body>

<!-- Invalid expression: multiple statements -->
<button :on:click="console.log('yes'); answer = 'no'"></button>

<!-- Invalid expression: function definition (top-level) -->
<body :data="{ foo: function() { return 'yes'; } }">
	<p :text="foo()"></p>
</body>
```
