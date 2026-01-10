# Performance Monitoring

`mancha` includes built-in performance monitoring tools to help you identify and optimize slow renders. These tools are designed to have minimal overhead when disabled and provide detailed insights when enabled.

## Debug Levels

Performance monitoring is controlled through debug levels. The `debug()` method accepts either a boolean (for backwards compatibility) or a debug level string:

```js
const { $ } = Mancha;

// Enable lifecycle-level debugging (recommended for most use cases)
$.debug(true);        // Same as $.debug('lifecycle')
$.debug('lifecycle');

// Enable effect-level debugging (logs individual effect timings)
$.debug('effects');

// Enable verbose debugging (logs everything, including internal operations)
$.debug('verbose');

// Disable debugging
$.debug(false);       // Same as $.debug('off')
$.debug('off');
```

### Debug Level Behavior

| Level      | Tracking                    | Console Output                           |
|------------|-----------------------------|-----------------------------------------|
| `off`      | Nothing                     | None                                    |
| `lifecycle`| Lifecycle + effect stats    | Slow effects only (>16ms)               |
| `effects`  | Same as lifecycle           | Above + individual effect timings       |
| `verbose`  | Same as lifecycle           | Above + all internal logging            |

The `lifecycle` level is the recommended default for performance analysis. It tracks all the data needed for `performanceReport()` while keeping console output minimal.

## Performance Reports

After mounting your application with debugging enabled, you can retrieve a structured performance report:

```js
const { $ } = Mancha;
$.debug('lifecycle');
await $.mount(document.body);

const report = $.performanceReport();
console.log(report);
```

### Report Structure

```js
{
  lifecycle: {
    mountTime: 45.2,        // Total mount time in milliseconds
    preprocessTime: 12.1,   // Time spent in preprocessing phase
    renderTime: 33.1        // Time spent in rendering phase
  },
  effects: {
    total: 25,              // Total number of unique effects
    byDirective: {
      'bind': { count: 10, totalTime: 5.2 },
      'for': { count: 3, totalTime: 15.8 },
      'text': { count: 12, totalTime: 2.1 }
    },
    slowest: [              // Top 10 slowest effects
      {
        id: 'for:product-list:products',
        executionCount: 1,
        totalTime: 15.8,
        avgTime: 15.8
      },
      // ...
    ]
  },
  observers: {
    totalKeys: 8,           // Number of unique keys being watched
    totalObservers: 25,     // Total number of observers
    byKey: {                // Observers per key
      'products': 5,
      'selectedItem': 3
    }
  }
}
```

## Effect Identification

Each effect is identified by a unique ID composed of the directive name, element identifier, and expression. The element identifier is determined by the following priority:

1. `data-perfid` - Explicit performance ID (highest priority)
2. `id` - Standard HTML id attribute
3. `data-testid` - Common testing identifier
4. Node path - Fallback, e.g., `html>body>div>ul>li:nth-child(2)`

### Using data-perfid

For reliable performance tracking, add `data-perfid` attributes to elements you want to monitor:

```html
<ul data-perfid="product-list" :for="product in products">
  <li data-perfid="product-item">{{ product.name }}</li>
</ul>

<input data-perfid="search-input" :bind="searchQuery" />
```

This produces effect IDs like:
- `for:product-list:products`
- `bind:search-input:searchQuery`

Without explicit identifiers, `mancha` falls back to the node path:
- `for:html>body>main>ul:products`

## Slow Effect Warnings

When debugging is enabled at the `lifecycle` level or higher, `mancha` automatically logs warnings for effects that take longer than 16ms (the frame budget for 60fps):

```
Slow effect (23.5ms): for:product-list:items
```

This helps identify render bottlenecks without needing to analyze the full performance report.

## Best Practices

### 1. Profile Before Optimizing

Always measure before making changes. Enable debugging, interact with your application, then check `performanceReport()`:

```js
$.debug('lifecycle');
await $.mount(document.body);

// Interact with your application...

console.table($.performanceReport().effects.slowest);
```

### 2. Add data-perfid to Critical Elements

For elements in loops or those with complex expressions, add `data-perfid` for clearer reports:

```html
<!-- Without data-perfid, the ID might be: for:html>body>div:nth-child(2)>ul:items -->
<!-- With data-perfid, the ID is: for:order-list:items -->
<ul data-perfid="order-list" :for="order in orders">
  <li data-perfid="order-row">{{ order.id }}</li>
</ul>
```

### 3. Check Observer Counts

High observer counts on a single key can indicate performance issues:

```js
const report = $.performanceReport();
for (const [key, count] of Object.entries(report.observers.byKey)) {
  if (count > 50) {
    console.warn(`Key "${key}" has ${count} observers - consider restructuring`);
  }
}
```

### 4. Reset on Each Mount

Performance data automatically resets when `mount()` is called. This means each mount cycle gives you fresh timing data:

```js
$.debug('lifecycle');

await $.mount(element1);
console.log($.performanceReport()); // Data for element1

await $.mount(element2);
console.log($.performanceReport()); // Fresh data for element2 only
```

### 5. Disable in Production

Performance tracking adds overhead. Always disable debugging in production:

```js
if (process.env.NODE_ENV !== 'production') {
  $.debug('lifecycle');
}
```

## Example: Identifying a Performance Issue

```html
<body :data="{ items: generateLargeList() }">
  <div data-perfid="item-container" :for="item in items">
    <span :text="expensiveFormat(item)"></span>
  </div>
</body>
<script type="module">
  import { Mancha } from 'mancha';

  Mancha.debug('lifecycle');
  await Mancha.mount(document.body);

  const report = Mancha.performanceReport();

  // Check which directives are slowest
  console.log('By directive:', report.effects.byDirective);

  // Check the 10 slowest individual effects
  console.table(report.effects.slowest);
</script>
```

Output might reveal:
```js
{
  byDirective: {
    'for': { count: 1, totalTime: 5.2 },
    ':text': { count: 1000, totalTime: 450.8 }  // Problem!
  }
}
```

This shows that while `:for` is fast, the 1000 `:text` effects using `expensiveFormat()` are the bottleneck.
