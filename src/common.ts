/** Returns a object with just one item */
export type ObjectItem<Name extends string> = { [K in Name]: string };

/** Same as {@link ObjectItem} but this one is optional. */
export type OptionalObjectItem<Name extends string> = {
    [K in Name]?: string | undefined;
};

/**
 * Only used to make types prettier. This one fixes joined types (&) to make
 * them look like one object.
 */
export type Mix<T> = { [K in keyof T]: T[K] };

export type EmptyObject = NonNullable<unknown>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type JoinOrChoose<T, U> = T extends undefined
    ? U
    : U extends undefined
      ? T
      : Mix<T & U>;

export type UnionToIntersection<U> = (
    U extends any ? (x: U) => void : never
) extends (x: infer I) => void
    ? I
    : never;

/** @see {@link https://stackoverflow.com/a/1584377} */
export function merge<T>(a: T[], b: T[], predicate = (a: T, b: T) => a === b) {
    const c = [...a]; // copy to avoid side effects

    b.forEach((bItem) =>
        c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)
    );
    return c;
}

