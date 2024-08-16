import { DomUtils } from "htmlparser2";
import { hasProperty } from "./dome.js";
export function innerHTML(elem) {
    if (hasProperty(elem, "innerHTML"))
        return elem.innerHTML;
    else
        return DomUtils.getInnerHTML(elem);
}
export function getTextContent(elem) {
    if (hasProperty(elem, "textContent"))
        return elem.textContent;
    else
        return DomUtils.textContent(elem);
}
