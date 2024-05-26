import { IRenderer } from "./core.js";
export class Renderer extends IRenderer {
    parseHTML(content, params = { root: false }) {
        throw new Error("Not implemented.");
    }
    serializeHTML(root) {
        throw new Error("Not implemented.");
    }
}
// Export the renderer instance directly.
export const Mancha = new Renderer();
