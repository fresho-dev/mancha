# Testing

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
