import { IRenderer } from "./renderer.js";

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
export function setupQueryParamBindings(renderer: IRenderer): void {
  const keyPrefix = "$$";

  /**
   * Updates the renderer's store based on the current URL's query parameters.
   * This is typically called on `popstate` events or initial load.
   */
  const updateStoreFromUrl = () => {
    const url = new URL(window.location.href);
    const presentKeysInUrl = new Set<string>();

    // Add/update params in store from URL
    for (const [key, value] of url.searchParams.entries()) {
      const storeKey = `${keyPrefix}${key}`;
      presentKeysInUrl.add(storeKey);
      if (renderer.get(storeKey) !== value) {
        renderer.set(storeKey, value);
      }
    }

    // Remove params from store that are no longer in URL
    const allQueryKeys = Object.keys(renderer.$).filter((k) => k.startsWith(keyPrefix));
    for (const key of allQueryKeys) {
      if (!presentKeysInUrl.has(key)) {
        renderer.del(key);
      }
    }
  };

  // Initial sync from URL to store
  updateStoreFromUrl();

  // Add a key handler for any key starting with '$$'
  renderer.addKeyHandler(new RegExp(`^\\$\\$`), (key, value) => {
    const url = new URL(window.location.href);
    const varname = key.substring(keyPrefix.length);
    let changed = false;

    if (!value) {
      if (url.searchParams.has(varname)) {
        url.searchParams.delete(varname);
        changed = true;
      }
    } else {
      const newVal = String(value);
      if (url.searchParams.get(varname) !== newVal) {
        url.searchParams.set(varname, newVal);
        changed = true;
      }
    }

    if (changed) {
      window.history.replaceState({}, "", url.toString());
    }
  });

  // Listen for URL changes (e.g., back/forward browser buttons)
  window.addEventListener("popstate", updateStoreFromUrl);
}
