import type { IRenderer } from "./renderer.js";

const KEY_PREFIX = "$$";
const FALLBACK_URL = "http://localhost/";

function getWindowURL(): URL {
	return new URL(globalThis.window?.location?.href || FALLBACK_URL);
}

/**
 * Converts a store key to a URL parameter name by removing the KEY_PREFIX.
 * @param storeKey The store key (e.g., "$$page")
 * @returns The URL parameter name (e.g., "page")
 */
function _storeKeyToParamName(storeKey: string): string {
	return storeKey.substring(KEY_PREFIX.length);
}

/**
 * Converts a URL parameter name to a store key by adding the KEY_PREFIX.
 * @param paramName The URL parameter name (e.g., "page")
 * @returns The store key (e.g., "$$page")
 */
function paramNameToStoreKey(paramName: string): string {
	return `${KEY_PREFIX}${paramName}`;
}

/**
 * Gets all store keys that represent query parameters (start with KEY_PREFIX).
 * @param renderer The renderer instance
 * @returns Array of store keys
 */
function getQueryStoreKeys(renderer: IRenderer): string[] {
	return renderer.keys().filter((k) => k.startsWith(KEY_PREFIX));
}

/**
 * Updates the renderer's store with values from URL search parameters.
 * @param renderer The renderer instance
 * @param url The URL to read parameters from
 */
async function updateStoreFromUrl(renderer: IRenderer, url: URL): Promise<void> {
	for (const [paramName, value] of url.searchParams.entries()) {
		const storeKey = paramNameToStoreKey(paramName);
		if (renderer.get(storeKey) !== value) {
			await renderer.set(storeKey, value);
		}
	}
}

/**
 * Updates URL search parameters based on a store key and value.
 * @param url The URL to modify
 * @param storeKey The store key
 * @param value The value to set
 * @returns Whether the URL was changed
 */
function updateUrlFromStoreValue(url: URL, storeKey: string, value: unknown): boolean {
	const paramName = _storeKeyToParamName(storeKey);
	let changed = false;

	if (!value) {
		if (url.searchParams.has(paramName)) {
			url.searchParams.delete(paramName);
			changed = true;
		}
	} else {
		const newVal = String(value);
		if (url.searchParams.get(paramName) !== newVal) {
			url.searchParams.set(paramName, newVal);
			changed = true;
		}
	}

	return changed;
}

/**
 * Updates the URL search parameters based on the renderer's store.
 * It checks all keys that start with KEY_PREFIX and updates the URL accordingly.
 * @param url The URL to modify
 * @param renderer The renderer instance
 */
function updateUrlFromStore(url: URL, renderer: IRenderer): void {
	let changed = false;
	for (const key of getQueryStoreKeys(renderer)) {
		if (updateUrlFromStoreValue(url, key, renderer.get(key))) {
			changed = true;
		}
	}
	if (changed) {
		globalThis.window?.history?.replaceState({}, "", url.toString());
	}
}

/**
 * Creates a handler that updates the renderer's store based on the current
 * URL's query parameters. This is used for the `popstate` event.
 * @param renderer The renderer instance.
 * @returns A function to be used as an event listener.
 */
function createStoreUpdater(renderer: IRenderer): () => void {
	return async () => {
		const url = getWindowURL();
		const presentKeysInUrl = new Set<string>();

		// Add/update params in store from URL
		for (const [key, value] of url.searchParams.entries()) {
			const storeKey = paramNameToStoreKey(key);
			presentKeysInUrl.add(storeKey);
			if (renderer.get(storeKey) !== value) {
				renderer.set(storeKey, value);
			}
		}

		// Remove params from store that are no longer in URL
		const allQueryKeys = getQueryStoreKeys(renderer);
		for (const key of allQueryKeys) {
			if (!presentKeysInUrl.has(key)) {
				renderer.del(key);
			}
		}
	};
}

/**
 * Sets up two-way binding between the renderer's keystore and URL query parameters.
 * It creates individual store keys for each parameter using the pattern `$$varname`,
 * allowing components to watch for specific parameter changes. It also listens for `popstate`
 * events to update the store when the user navigates through history.
 *
 * This function should be called once, for example in `IRenderer.mount()`.
 *
 * @param renderer The renderer instance.
 */
export async function setupQueryParamBindings(renderer: IRenderer): Promise<void> {
	const url = getWindowURL();

	// First, update store with URL parameters (URL takes precedence over existing store values)
	await updateStoreFromUrl(renderer, url);

	// Then, update URL with any store defaults that aren't already in the URL
	updateUrlFromStore(url, renderer);

	// Set up the URL updater to listen for changes in the store.
	renderer.addKeyHandler(/^\$\$/, (key, value) => {
		const url = getWindowURL();
		const changed = updateUrlFromStoreValue(url, key, value);

		if (changed) {
			globalThis.window?.history?.replaceState({}, "", url.toString());
		}
	});

	// Set up the popstate listener to update the store when the URL changes.
	globalThis.window?.addEventListener("popstate", createStoreUpdater(renderer));
}
