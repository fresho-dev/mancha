import type { IRenderer } from "./renderer.js";

export interface ParserParams {
	/** Whether the file parsed is a root document, or a document fragment. */
	rootDocument?: boolean;
	/** Encoding to use when processing local files. */
	encoding?: "ascii" | "utf8";
}

/** The RendererParams interface defines the parameters that can be passed to the renderer. */
export interface RenderParams {
	/** The current directory of the file being rendered. */
	dirpath?: string;
	/** Maximum level of recursion allowed when resolving includes. */
	maxdepth?: number;
	/** Cache policy used when resolving remote paths. */
	cache?: RequestCache | null;
	/** Whether the current node is the root used in Mancha.moun(...). */
	rootNode?: Node;
}

export type RendererPlugin = (
	this: IRenderer,
	node: ChildNode,
	params?: RenderParams,
) => void | Promise<void>;

/** Debug level for controlling performance tracking and logging verbosity. */
export type DebugLevel = "off" | "lifecycle" | "effects" | "verbose";

/** Metadata for identifying effects in performance tracking. */
export type EffectMeta = {
	/** The directive that created this effect (e.g., 'class', 'bind', 'for'). */
	directive: string;
	/** The DOM element associated with this effect, if any. */
	element?: Element;
	/** The expression being evaluated by this effect. */
	expression?: string;
	/** Direct identifier for effects without a DOM element (e.g., computed property key). */
	id?: string;
};

/** Statistics for a tracked effect. */
export type EffectStats = {
	/** Effect identifier (e.g., "bind:my-input:user.name"). */
	id: string;
	/** Number of times this effect has executed. */
	executionCount: number;
	/** Total execution time in milliseconds. */
	totalTime: number;
	/** Average execution time per invocation in milliseconds. */
	avgTime: number;
};

/** Structured performance report returned by getPerformanceReport(). */
export type PerformanceReport = {
	/** Timing data for lifecycle methods. */
	lifecycle: {
		mountTime?: number;
		preprocessTime?: number;
		renderTime?: number;
	};
	/** Effect execution statistics. */
	effects: {
		/** Total number of unique effects tracked. */
		total: number;
		/** Aggregate stats grouped by directive type. */
		byDirective: Record<string, { count: number; totalTime: number }>;
		/** Top 10 slowest effects by total time. */
		slowest: EffectStats[];
	};
	/** Observer registration statistics. */
	observers: {
		/** Number of keys with registered observers. */
		totalKeys: number;
		/** Total number of observer registrations. */
		totalObservers: number;
		/** Observer count per key. */
		byKey: Record<string, number>;
	};
};
