import * as ulive from "ulive";

function isInstance<T>(object: any): object is ulive.Signal<T> {
  return (
    object &&
    typeof object === "object" &&
    "value" in object &&
    "peek" in object &&
    "then" in object &&
    "valueOf" in object &&
    "toJSON" in object &&
    "toString" in object
  );
}

function wrap<T extends Object>(object: T): ulive.Signal<T> {
  // If this object is already a signal, return it as-is.
  if (isInstance<T>(object)) return object;

  // Turn any existing properties into signals.
  for (const key in object) {
    if (object.hasOwnProperty(key) && typeof object[key] === "object" && object[key] != null) {
      (object as any)[key] = wrap(object[key] as any) as ulive.Signal<any>;
    }
  }

  return ulive.signal(object);
}

export namespace Signal {
  export type Type<T> = ulive.Signal<T>;
  export function from<T>(value: T): ulive.Signal<T> {
    if (isInstance<T>(value)) return value;
    else if (typeof value === "object") return wrap(value as Object) as ulive.Signal<T>;
    else return ulive.signal(value);
  }

  export const effect = ulive.effect;
  export const computed = ulive.computed;
  export const batch = ulive.batch;
  export const untracked = ulive.untracked;
}
