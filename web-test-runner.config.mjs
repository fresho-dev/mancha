/**
 * An idle renderer process gets its timers coalesced by the OS — measured at up to 100ms per
 * `setTimeout` on macOS, against the 10ms `REACTIVE_DEBOUNCE_MILLIS` the reactive tests are
 * written around. Keeping one empty interval alive stops the process from going idle, so
 * timers land when they were asked to and the debounce assertions mean what they say.
 */
const KEEP_TIMERS_UNCOALESCED = "<script>setInterval(() => {}, 1);</script>";

export default {
	testRunnerHtml: (testFramework) =>
		`<!DOCTYPE html><html><body>
			${KEEP_TIMERS_UNCOALESCED}
			<script type="module" src="${testFramework}"></script>
		</body></html>`,
};
