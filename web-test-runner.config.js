/**
 * An idle renderer process gets its timers coalesced by the OS — measured at up to 100ms per
 * `setTimeout` on macOS, against the 10ms `REACTIVE_DEBOUNCE_MILLIS` the reactive tests are
 * written around. Keeping one interval alive stops the process from going idle, so timers land
 * when they were asked to and the debounce assertions mean what they say. The nesting clamp
 * holds this to ~4ms rather than the 1ms asked for, which is well inside what it has to beat.
 *
 * Neither `--disable-features=AlignWakeUps` nor Playwright's own throttling flags change the
 * coalescing, and a bare Playwright page with no test runner shows it too, so this is not
 * Chromium's page throttling and not test-runner concurrency.
 */
const KEEP_TIMERS_UNCOALESCED = "<script>setInterval(() => {}, 1);</script>";

export default {
	// Keep the empty <head> the default page has: web-test-runner injects its own runtime into
	// the first of <head> or <body> it finds, and tests that mount document.body should not have
	// to walk that runtime's script nodes.
	testRunnerHtml: (testFramework) =>
		`<!DOCTYPE html><html><head>${KEEP_TIMERS_UNCOALESCED}</head><body>
			<script type="module" src="${testFramework}"></script>
		</body></html>`,
};
