import { JoinOrChoose } from "./common.js";

export type Validator = () => unknown;

export type Validators = {
    body: Validator;
    query: Validator;
    cookies: Validator;
};

export type RouteValidators = { [K in keyof Validators]: Validators[K][] };

export type ValidatorsToValidated<T extends Validators> = {
    [K in keyof T]: T[K] extends Validator ? ReturnType<T[K]> : unknown;
};

export type Validated<Body = unknown, Query = unknown, Cookies = unknown> = {
    body: Body;
    query: Query;
    cookies: Cookies;
};

export type JoinValidators<T extends Validated, U extends Validated> = {
    body: JoinOrChoose<T["body"], U["body"]>;
    query: JoinOrChoose<T["query"], U["query"]>;
    cookies: JoinOrChoose<T["cookies"], U["cookies"]>;
};

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
    };
}

export function validatorsToRouteValidators(
    validators: Partial<Validators>
): RouteValidators {
    return {
        body: validators.body ? [validators.body] : [],
        query: validators.query ? [validators.query] : [],
        cookies: validators.cookies ? [validators.cookies] : [],
    };
}

