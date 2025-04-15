import { OpenApiDocumentationOptions } from "./openApi.js";
import { ParsedParams } from "./parse.js";
import { Path } from "./path.js";
import { Method, Route, RouteContext, RouteGroup } from "./routeGroup.js";

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
    route: Route;
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
    if (path === "/") return [];

    return path.split("/").slice(1);
}

export abstract class Router {
    abstract addRoute(route: RouteGroup<RouteContext>): void;

    /** @internal */
    abstract findRoute(method: Method, path: Path): RouterResponse;

    abstract getOpenApiDocs(options: OpenApiDocumentationOptions): string;
}

export class RouterError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export function methodAlreadyAssignedRouterError(
    path: Path,
    method: Method | undefined
): RouterError {
    return new RouterError(
        `A handler for the router path '${path}' and ${!method ? "wildcard method" : `method '${method}'`} has already been assigned. There can only be one handler per method per path. `
    );
}

