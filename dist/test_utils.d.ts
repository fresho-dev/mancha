export declare function innerHTML(elem: Element): string;
export declare function getTextContent(elem: Element): string | null;
export declare const assert: {
    equal: (actual: any, expected: any, message?: string) => void;
    deepEqual: (actual: any, expected: any, message?: string) => void;
    notEqual: (actual: any, expected: any, message?: string) => void;
    ok: (value: any, message?: string) => void;
    fail: (message?: string) => never;
    throws: (fn: () => void, message?: string) => void;
    rejects: (p: Promise<any>, message?: string) => Promise<void>;
};
