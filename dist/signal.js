import * as ulive from "ulive";
function isInstance(object) {
    return (object &&
        typeof object === "object" &&
        "value" in object &&
        "peek" in object &&
        "then" in object &&
        "valueOf" in object &&
        "toJSON" in object &&
        "toString" in object);
}
function wrap(object) {
    // If this object is null or already a signal, return it as-is.
    if (isInstance(object))
        return object;
    // Turn any existing properties into signals.
    for (const key in object) {
        if (object.hasOwnProperty(key) && typeof object[key] === "object" && object[key] != null) {
            object[key] = wrap(object[key]);
        }
    }
    return ulive.signal(object);
}
export var Signal;
(function (Signal) {
    function from(value) {
        if (isInstance(value))
            return value;
        else if (typeof value === "object")
            return wrap(value);
        else
            return ulive.signal(value);
    }
    Signal.from = from;
    Signal.effect = ulive.effect;
    Signal.computed = ulive.computed;
    Signal.batch = ulive.batch;
    Signal.untracked = ulive.untracked;
})(Signal || (Signal = {}));
