import { ParsedParams } from "./parse.js";
import { Path } from "./path.js";
import { Handler, Method, Route } from "./routeGroup.js";

export enum RouterResponseType {
    Found,
    MatchingPathInvalidMethod,
    NotFound,
}

export type RouterResponse =
    | RouterFoundResponse
    | RouterMatchingPathInvalidMethodResponse
    | RouterNotFoundResponse;

export type RouterFoundResponse = {
    type: RouterResponseType.Found;
    handler: Handler;
    params: ParsedParams;
};

export type RouterMatchingPathInvalidMethodResponse = {
    type: RouterResponseType.MatchingPathInvalidMethod;
    validMethods: Method[];
};

export type RouterNotFoundResponse = {
    type: RouterResponseType.NotFound;
};

export type SplitPath = string[];

export function splitPath(path: Path): SplitPath {
    return path.split("/").slice(1);
}

export abstract class Router {
    abstract addRoute(routes: Route): void;
    abstract findRoute(method: Method, path: Path): RouterResponse;
}

export class RouterError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export function methodAlreadyAssignedRouterError(
    path: Path,
    method: Method
): RouterError {
    return new RouterError(
        `A handler for the router path '${path}' and method '${method}' has already been assigned. There can only be one handler per method per path. `
    );
}
