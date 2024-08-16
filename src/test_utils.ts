import { DomUtils } from "htmlparser2";
import { hasProperty } from "./dome.js";

export function innerHTML(elem: Element): string {
  if (hasProperty(elem, "innerHTML")) return elem.innerHTML;
  else return DomUtils.getInnerHTML(elem as any);
}

export function getTextContent(elem: Element): string | null {
  if (hasProperty(elem, "textContent")) return elem.textContent;
  else return DomUtils.textContent(elem as any);
}
