import {
    Intersect,
    Static,
    TIntersect,
    TObject,
    TSchema,
} from "@sinclair/typebox";
import { JoinOrChoose } from "./common.js";

export type Validators = {
    body: TSchema;
    query: TObject;
    cookies: TObject;
    headers: TObject;
};

export type RouteValidators = { [K in keyof Validators]: Validators[K][] };

export type ValidatorsToValidated<T extends Partial<Validators>> = Validated<
    T["body"] extends TSchema ? Static<T["body"]> : unknown,
    T["query"] extends TSchema ? Static<T["query"]> : unknown,
    T["cookies"] extends TSchema ? Static<T["cookies"]> : unknown,
    T["headers"] extends TSchema ? Static<T["headers"]> : unknown
>;

export type Validated<
    Body = unknown,
    Query = unknown,
    Cookies = unknown,
    Headers = unknown,
> = {
    body: Body;
    query: Query;
    cookies: Cookies;
    headers: Headers;
};

export type JoinValidated<T extends Validated, U extends Validated> = {
    body: JoinOrChoose<T["body"], U["body"]>;
    query: JoinOrChoose<T["query"], U["query"]>;
    cookies: JoinOrChoose<T["cookies"], U["cookies"]>;
    headers: JoinOrChoose<T["headers"], U["headers"]>;
};

// export type JoinValidators<T extends Validated, U extends Validated> = {
//     body: JoinOrChoose<T["body"], U["body"]>;
//     query: JoinOrChoose<T["query"], U["query"]>;
//     cookies: JoinOrChoose<T["cookies"], U["cookies"]>;
//     headers: JoinOrChoose<T["headers"], U["headers"]>;
// };

type IntersectSchemaIfPossible<
    T extends TSchema | undefined,
    U extends TSchema,
> = T extends TSchema ? TIntersect<[T, U]> : U;

export type JoinValidators<
    T extends Partial<Validators>,
    U extends Validators,
> = {
    body: IntersectSchemaIfPossible<T["body"], U["body"]>;
    query: IntersectSchemaIfPossible<T["query"], U["query"]>;
    cookies: IntersectSchemaIfPossible<T["cookies"], U["cookies"]>;
    headers: IntersectSchemaIfPossible<T["headers"], U["headers"]>;
};

// export type JoinRouteValidators<
//     T extends RouteValidators,
//     U extends RouteValidators,
// > = {
//     body: TIntersect<[T["body"], U["body"]]>;
//     query: TIntersect<[T["query"], U["query"]]>;
//     cookies: TIntersect<[T["cookies"], U["cookies"]]>;
//     headers: TIntersect<[T["headers"], U["headers"]]>;
// };

export function joinRouteValidators(
    validators: Partial<Validators>,
    routeValidators: RouteValidators
): RouteValidators {
    return {
        body: validators.body
            ? [validators.body, ...routeValidators.body]
            : routeValidators.body,
        query: validators.query
            ? [validators.query, ...routeValidators.query]
            : routeValidators.query,
        cookies: validators.cookies
            ? [validators.cookies, ...routeValidators.cookies]
            : routeValidators.cookies,
        headers: validators.headers
            ? [validators.headers, ...routeValidators.headers]
            : routeValidators.headers,
    };
}

export function validatorsToRouteValidators(
    validators: Partial<Validators>
): RouteValidators {
    return {
        body: validators.body ? [validators.body] : [],
        query: validators.query ? [validators.query] : [],
        cookies: validators.cookies ? [validators.cookies] : [],
        headers: validators.headers ? [validators.headers] : [],
    };
}

