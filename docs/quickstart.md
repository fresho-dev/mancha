# Quick Start

With `mancha`, it's easier than ever to create simple web apps that require no server-side rendering
or build tools. Once the complexity of your project grows, you can add those things as needed.

To get started, simply add this to your HTML head attribute:

```html
<script src="//unpkg.com/mancha" css="utils" init></script>
```

## Basic Form

After importing `Mancha`, you can take advantage of reactivity and tailwind-compatible CSS styling.
For example, a basic form might look like this

```html
<body :data="{ name: null }">
  <form
    class="flex flex-col max-w-md p-4 bg-white rounded-lg"
    :on:submit="console.log('submitted')"
  >
    <label class="w-full mb-4">
      <span class="block text-sm font-medium text-gray-700">Name</span>
      <input
        required
        type="text"
        :bind="name"
        class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
      />
    </label>
    <button
      type="submit"
      class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
    >
      Submit
    </button>
  </form>
</body>
```

In the code above, the `:on:submit` tag simply prints 'submitted' to the console. Note that `Mancha`
automatically prevents the form submission from refreshing the page by calling
`event.prevenDefault()`. You can also trigger this behavior with other events by adding a `:prevent`
attribute to the element. To provide more complex handlers, you can define callbacks as a function:

```html
<body :data="{ name: null, message: null }">
  <!-- Form with handler referencing a user-defined function -->
  <form class="flex flex-col max-w-md p-4 bg-white rounded-lg" :on:submit="handleForm($event)">
    <label class="w-full mb-4">
      <span class="block text-sm font-medium text-gray-700">Name</span>
      <input
        required
        type="text"
        :bind="name"
        class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
      />
    </label>
    <button
      type="submit"
      class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
    >
      Submit
    </button>

    <!-- To be shown only once `message` is truthy -->
    <p class="w-full mt-4 text-gray-700 text-center" :show="message">{{ message }}</p>
  </form>
</body>

<script>
  // Mancha is a global variable and $ is a shorthand for the renderer context.
  const { $ } = Mancha;

  // We can use the $ shorthand to access the form data and define variables.
  $.handleForm = function (event) {
    console.log(event);
    this.message = `Hello, ${this.name}!`;
  };

  // The script tag already contains the `init` attribute. So we don't need
  // to call `$.mount()` explicitly.
  // $.mount(document.body);
</script>
```

If you want more control over the initialization lifecycle, you can remove the `init` attribute from
the `<script>` tag that imports `Mancha`, and explicitly call the `mount()` function:

```html
<script src="//unpkg.com/mancha" css="utils"></script>

<body>
  <form class="flex flex-col max-w-md p-4 bg-white rounded-lg" :on:submit="handleForm($event)">
    <label class="w-full mb-4">
      <span class="block text-sm font-medium text-gray-700">Name</span>
      <input
        required
        type="text"
        :bind="name"
        class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
      />
    </label>
    <button
      type="submit"
      class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
    >
      Submit
    </button>

    <p class="w-full mt-4 text-gray-700 text-center" :show="message">{{ message }}</p>
  </form>
</body>

<script type="module">
  // Mancha is a global variable and $ is a shorthand for the renderer context.
  const { $ } = Mancha;

  // We can use the $ shorthand to access the form data and define variables.
  $.handleForm = function (event) {
    console.log(event);
    this.message = `Hello, ${this.name}!`;
  };

  // Define the variables that will be used in the form.
  $.name = null;
  $.message = null;

  // Mount the renderer context to the body element.
  await $.mount(document.body);
</script>
```

## URL Query Parameter Binding

`mancha` makes it easy to synchronize your application's state with the URL query parameters. This is particularly useful for maintaining state across page reloads or for creating shareable links.

This feature works automatically for any variable prefixed with `$$`. When a `$$` variable is changed in your application, the URL is updated. Conversely, when the page loads, `mancha` reads the query parameters from the URL and populates the corresponding `$$` variables in your application's state.

Here's how you can use it:

```html
<body :data="{ $$search: '' }">
  <form class="flex flex-col max-w-md p-4 bg-white rounded-lg">
    <label class="w-full mb-4">
      <span class="block text-sm font-medium text-gray-700">Search</span>
      <input
        type="text"
        :bind="$$search"
        class="w-full mt-1 p-2 border border-gray-300 rounded-md focus:border-indigo-500"
        placeholder="Type to see the URL change..."
      />
    </label>
    <div :show="$$search" class="mt-2">
      <p>Current search query: <span class="font-mono">{{ $$search }}</span></p>
    </div>
  </form>
</body>
```

In this example, the input field is bound to `$$search`. As you type, the URL will be updated with a `search` query parameter (e.g., `?search=your-text`). If you reload the page with the query parameter in the URL, the input field will be automatically populated with the value from the URL.

## Testing

`mancha`'s architecture makes it easy to test your application's UI without having to run a full browser environment. You can use a library like `JSDOM` to simulate a browser environment in Node.js and then use mancha to render your components and make assertions about the output.

Here's an example of how you can test a simple component:

```html
<!-- my-component.html -->
<body>
  <button data-testid="login-button" :show="!user">Login</button>
  <button data-testid="logout-button" :show="user">Logout</button>
</body>
```

```js
// test.js
import { test, describe, before } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Renderer } from "mancha";

const componentPath = path.join(import.meta.dirname, "my-component.html");
const findByTestId = (node, testId) => node.querySelector(`[data-testid="${testId}"]`);

describe("My Component", () => {

  test("renders correctly when logged out", async () => {
    // 1. Initialize the renderer with the desired state for this test case.
    const renderer = new Renderer({ user: null });

    // 2. Create a clean DOM fragment from the page content.
    const fragment = await renderer.preprocessLocal(componentPath);

    // 3. Mount the renderer to the fragment to apply data bindings.
    await renderer.mount(fragment);

    // 4. Find elements and assert their state.
    const loginButton = findByTestId(fragment, "login-button");
    const logoutButton = findByTestId(fragment, "logout-button");

    assert.ok(loginButton, "Login button should exist");
    assert.ok(logoutButton, "Logout button should exist");

    assert.strictEqual(loginButton.style.display, "", "Login button should be visible");
    assert.strictEqual(logoutButton.style.display, "none", "Logout button should be hidden");
  });

  test("renders correctly when logged in", async () => {
    // 1. Initialize the renderer with the desired state for this test case.
    const renderer = new Renderer({ user: { name: "John Doe" } });

    // 2. Create a clean DOM fragment from the page content.
    const fragment = await renderer.preprocessLocal(componentPath);

    // 3. Mount the renderer to the fragment to apply data bindings.
    await renderer.mount(fragment);

    // 4. Find elements and assert their state.
    const loginButton = findByTestId(fragment, "login-button");
    const logoutButton = findByTestId(fragment, "logout-button");

    assert.strictEqual(loginButton.style.display, "none", "Login button should be hidden");
    assert.strictEqual(logoutButton.style.display, "", "Logout button should be visible");
  });
});
```

