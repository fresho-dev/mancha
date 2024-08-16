import { safeStyleSheet } from "safevalues";
export default function rules() {
    // Based on https://www.swyx.io/css-100-bytes.
    return safeStyleSheet `
    html {
        max-width: 70ch;
        padding: 2em 1em;
        margin: auto;
        line-height: 1.75;
        font-size: 1.25em;
        font-family: sans-serif;
    }

    h1,h2,h3,h4,h5,h6 {
        margin: 1em 0 0.5em;
    }

    p,ul,ol {
        margin-bottom: 1em;
        color: #1d1d1d;
    }`;
}
