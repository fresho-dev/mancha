import * as ulive from "ulive";
export declare namespace Signal {
    type Type<T> = ulive.Signal<T>;
    function from<T>(value: T): ulive.Signal<T>;
    const effect: typeof ulive.effect;
    const computed: typeof ulive.computed;
    const batch: typeof ulive.batch;
    const untracked: typeof ulive.untracked;
}
