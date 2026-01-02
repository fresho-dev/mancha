import { concatStyleSheets, type SafeStyleSheet, safeStyleSheet } from "safevalues";

export default function rules(): SafeStyleSheet {
	// Inspired by Tailwind CSS.
	return concatStyleSheets([
		// Prevent padding and border from affecting element width.
		safeStyleSheet`*,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}`,

		// Use a consistent sensible line-height in all browsers.
		// Prevent adjustments of font size after orientation changes in iOS.
		// Use a more readable tab size.
		// Use the user's configured 'sans' font-family by default.
		safeStyleSheet`html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;tab-size:4;font-family:ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";font-feature-settings:normal;font-variation-settings:normal}`,

		// Remove default margin.
		safeStyleSheet`body{margin:0;line-height:inherit}`,

		// Add the correct height in Firefox.
		// Correct the inheritance of border color in Firefox.
		// Ensure horizontal rules are visible by default.
		safeStyleSheet`hr{height:0;color:inherit;border-top-width:1px}`,

		// Add the correct text decoration in Chrome, Edge, and Safari.
		safeStyleSheet`abbr:where([title]){text-decoration:underline dotted}`,

		// Add the correct font weight in Edge and Safari.
		safeStyleSheet`b,strong{font-weight:bolder}`,

		// Typography for code elements.
		safeStyleSheet`code,kbd,samp,pre{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;font-size:1em}`,

		// Add the correct font size in all browsers.
		safeStyleSheet`small{font-size:80%}`,

		// Prevent 'sub' and 'sup' elements from affecting the line height in all browsers.
		safeStyleSheet`sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}`,
		safeStyleSheet`sub{bottom:-0.25em}`,
		safeStyleSheet`sup{top:-0.5em}`,

		// Form elements inheritance and resets.
		safeStyleSheet`button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;color:inherit;margin:0;padding:0}`,

		// Remove the inheritance of text transform in Edge and Firefox.
		safeStyleSheet`button,select{text-transform:none}`,

		// Correct the inability to style clickable types in iOS and Safari.
		// Remove default appearance in most browsers.
		// Add cursor: pointer to buttons as requested.
		safeStyleSheet`button,[type='button'],[type='reset'],[type='submit']{-webkit-appearance:button;background-color:transparent;background-image:none;cursor:pointer}`,

		// Use the modern Firefox focus style for all focusable elements.
		safeStyleSheet`:-moz-focusring{outline:auto}`,

		// Remove the additional :invalid styles in Firefox.
		safeStyleSheet`:-moz-ui-invalid{box-shadow:none}`,

		// Add the correct vertical alignment in Chrome and Firefox.
		safeStyleSheet`progress{vertical-align:baseline}`,

		// Correct the cursor style of increment and decrement buttons in Safari.
		safeStyleSheet`::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}`,

		// Search input styles.
		safeStyleSheet`[type='search']{-webkit-appearance:textfield;outline-offset:-2px}`,
		safeStyleSheet`::-webkit-search-decoration{-webkit-appearance:none}`,

		// File upload button.
		safeStyleSheet`::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}`,

		// Summary element style.
		safeStyleSheet`summary{display:list-item}`,

		// Block quotes, descriptions etc resets.
		safeStyleSheet`blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}`,

		// Fieldset reset.
		safeStyleSheet`fieldset{margin:0;padding:0}`,

		// Legend reset.
		safeStyleSheet`legend{padding:0}`,

		// List resets.
		safeStyleSheet`ol,ul,menu{list-style:none;margin:0;padding:0}`,

		// Textareas resizing.
		safeStyleSheet`textarea{resize:vertical}`,

		// Placeholder color.
		safeStyleSheet`::placeholder{opacity:1;color:#9ca3af}`,

		// Button roles.
		safeStyleSheet`button,[role="button"]{cursor:pointer}`,

		// Disabled cursor.
		safeStyleSheet`:disabled{cursor:default;pointer-events:none;opacity:0.75}`,

		// Image display.
		safeStyleSheet`img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}`,

		// Image constraints.
		safeStyleSheet`img,video{max-width:100%;height:auto}`,

		// Hidden attribute.
		safeStyleSheet`[hidden]{display:none}`,

		// Dialog backdrop as requested.
		safeStyleSheet`dialog{padding:0}`,
		safeStyleSheet`dialog::backdrop{background:rgba(0,0,0,0.5)}`,
	]);
}
