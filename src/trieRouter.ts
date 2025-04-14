import { merge } from "./common.js";
import {
    ParseParamFunction,
    unparseableParam,
    UnparseableParamError,
} from "./parse.js";
import { Path, removeFirstSlug } from "./path.js";
import {
    Method,
    Route,
    RouteContext,
    RouteGroup,
    RouteGroupBuilder,
} from "./routeGroup.js";
import {
    SplitPath,
    RouterFoundResponse,
    RouterResponse,
    RouterResponseType,
    Router,
    splitPath,
    methodAlreadyAssignedRouterError,
} from "./router.js";

export type DynamicParsedGroup = {
    paramName: string;
    parser: ParseParamFunction<unknown>;
    group: TrieRouterRouteGroup;
};

export type DynamicGroup = {
    paramName: string;
    group: TrieRouterRouteGroup;
};

export type WildcardParsedGroup = {
    parser: ParseParamFunction<unknown>;
    group: TrieRouterRouteGroup;
};

export type WildcardGroup = {
    group: TrieRouterRouteGroup;
};

export class TrieRouterRouteGroup {
    #handlers: Record<Method, Route> = {};
    #wildcardMethodHandler: Route | undefined = undefined;
    #staticGroups: Record<string, TrieRouterRouteGroup> = {};
    #dynamicParsedGroups: DynamicParsedGroup[] = [];
    #dynamicGroups: DynamicGroup[] = [];
    #dynamicOptionalParsedGroups: DynamicParsedGroup[] = [];
    #dynamicOptionalGroups: DynamicGroup[] = [];
    #wildcardParsedGroups: WildcardParsedGroup[] = [];
    #wildcardGroup: WildcardGroup | undefined = undefined;
    #wildcardOptionalParsedGroups: WildcardParsedGroup[] = [];
    #wildcardOptionalGroup: WildcardGroup | undefined = undefined;

    #removeFirstRouteSlug(route: Route): Route {
        return {
            ...route,
            path: removeFirstSlug(route.path),
        };
    }

    #addDynamicRoute(
        route: Route,
        paramName: string,
        isOptional: boolean,
        parser: ParseParamFunction<unknown> | undefined
    ): void {
        if (parser) {
            const groupArray = isOptional
                ? this.#dynamicOptionalParsedGroups
                : this.#dynamicParsedGroups;

            for (const group of groupArray) {
                if (group.parser === parser && group.paramName === paramName) {
                    group.group.addRoute(this.#removeFirstRouteSlug(route));

                    return;
                }
            }

            const group = new TrieRouterRouteGroup();
            group.addRoute(this.#removeFirstRouteSlug(route));

            groupArray.push({
                paramName: paramName,
                parser: parser,
                group: group,
            });

            return;
        }

        const groupArray = isOptional
            ? this.#dynamicOptionalGroups
            : this.#dynamicGroups;

        for (const group of groupArray) {
            if (group.paramName === paramName) {
                group.group.addRoute(this.#removeFirstRouteSlug(route));

                return;
            }
        }

        const group = new TrieRouterRouteGroup();
        group.addRoute(this.#removeFirstRouteSlug(route));

        groupArray.push({
            paramName: paramName,
            group: group,
        });
    }

    #addParsedWildcardRoute(
        route: Route,
        parser: ParseParamFunction<unknown>,
        isOptional: boolean
    ): void {
        const groupArray = isOptional
            ? this.#wildcardOptionalParsedGroups
            : this.#wildcardParsedGroups;

        for (const group of groupArray) {
            if (group.parser !== parser) continue;

            group.group.addRoute(this.#removeFirstRouteSlug(route));

            return;
        }

        const group = new TrieRouterRouteGroup();
        group.addRoute(this.#removeFirstRouteSlug(route));

        groupArray.push({
            parser: parser,
            group: group,
        });
    }

    addRoute(route: Route): void {
        const path = splitPath(route.path);
        const slug = path[0];

        if (!slug) {
            if (route.methods === null) {
                if (this.#wildcardMethodHandler)
                    throw methodAlreadyAssignedRouterError(
                        route.path,
                        undefined
                    );

                this.#wildcardMethodHandler = route;

                return;
            }

            for (const method of route.methods) {
                if (this.#handlers[method])
                    throw methodAlreadyAssignedRouterError(route.path, method);

                this.#handlers[method] = route;
            }

            return;
        }

        if (slug.startsWith(":")) {
            const isOptional = slug.endsWith("?");
            const paramName = slug.slice(1, isOptional ? -1 : undefined);

            //@ts-ignore
            const parser = route.parsers[paramName] as
                | ParseParamFunction<unknown>
                | undefined;

            this.#addDynamicRoute(route, paramName, isOptional, parser);

            return;
        }

        if (slug === "*" || slug === "*?") {
            const isOptional = slug.endsWith("?");

            //@ts-ignore
            const parser = route.parsers["wildcard"] as
                | ParseParamFunction<unknown>
                | undefined;

            if (!parser && isOptional) {
                if (this.#wildcardOptionalGroup) {
                    this.#wildcardOptionalGroup.group.addRoute(
                        this.#removeFirstRouteSlug(route)
                    );

                    return;
                }

                const group = new TrieRouterRouteGroup();
                group.addRoute(this.#removeFirstRouteSlug(route));

                this.#wildcardOptionalGroup = {
                    group: group,
                };

                return;
            } else if (!parser) {
                if (this.#wildcardGroup) {
                    this.#wildcardGroup.group.addRoute(
                        this.#removeFirstRouteSlug(route)
                    );

                    return;
                }

                const group = new TrieRouterRouteGroup();
                group.addRoute(this.#removeFirstRouteSlug(route));

                this.#wildcardGroup = {
                    group: group,
                };

                return;
            }

            this.#addParsedWildcardRoute(route, parser, isOptional);
            return;
        }

        if (this.#staticGroups[slug]) {
            this.#staticGroups[slug].addRoute(
                this.#removeFirstRouteSlug(route)
            );

            return;
        }

        const group = new TrieRouterRouteGroup();
        group.addRoute(this.#removeFirstRouteSlug(route));

        this.#staticGroups[slug] = group;
    }

    #shouldReturn(response: RouterResponse): response is RouterFoundResponse {
        return response.type === RouterResponseType.Found;
    }

    #keepResponseOfHigherPriority(
        oldRepsonse: RouterResponse,
        response: RouterResponse
    ): RouterResponse {
        switch (response.type) {
            case RouterResponseType.Found:
                return response;
            case RouterResponseType.MatchingPathInvalidMethod:
                if (
                    oldRepsonse.type ===
                    RouterResponseType.MatchingPathInvalidMethod
                ) {
                    return {
                        type: RouterResponseType.MatchingPathInvalidMethod,
                        validMethods: merge(
                            oldRepsonse.validMethods,
                            response.validMethods
                        ),
                    };
                }

                return response;
            default:
                return oldRepsonse;
        }
    }

    #findDynamicMatchingParsedGroup(
        method: Method,
        path: SplitPath,
        groups: DynamicParsedGroup[]
    ): RouterResponse {
        let matchingRoute: RouterResponse = {
            type: RouterResponseType.NotFound,
        };

        for (const { paramName, parser, group } of groups) {
            let parsedParam: unknown;
            try {
                parsedParam = parser(path[0], unparseableParam);
            } catch (err) {
                if (err instanceof UnparseableParamError) continue;

                throw err;
            }

            matchingRoute = this.#keepResponseOfHigherPriority(
                matchingRoute,
                group.findMatchingRoute(method, path.splice(1))
            );
            if (this.#shouldReturn(matchingRoute)) {
                matchingRoute.params[paramName] = parsedParam;

                return matchingRoute;
            }
        }

        return matchingRoute;
    }

    #findDynamicMatchingGroup(
        method: Method,
        path: SplitPath,
        groups: DynamicGroup[]
    ): RouterResponse {
        let matchingRoute: RouterResponse = {
            type: RouterResponseType.NotFound,
        };

        for (const { paramName, group } of groups) {
            matchingRoute = this.#keepResponseOfHigherPriority(
                matchingRoute,
                group.findMatchingRoute(method, path.slice(1))
            );
            if (this.#shouldReturn(matchingRoute)) {
                matchingRoute.params[paramName] = path[0];

                return matchingRoute;
            }
        }

        return matchingRoute;
    }

    #findWildcardMatchingParsedGroup(
        method: Method,
        path: SplitPath,
        groups: WildcardParsedGroup[]
    ) {
        let matchingRoute: RouterResponse = {
            type: RouterResponseType.NotFound,
        };

        for (const { parser, group } of groups) {
            let parsedParam: unknown;
            try {
                parsedParam = parser(path[0], unparseableParam);
            } catch (err) {
                if (err instanceof UnparseableParamError) continue;

                throw err;
            }

            matchingRoute = this.#keepResponseOfHigherPriority(
                matchingRoute,
                group.findMatchingRoute(method, path.splice(1))
            );
            if (this.#shouldReturn(matchingRoute)) {
                matchingRoute.params["wildcard"] = parsedParam;

                return matchingRoute;
            }
        }

        return matchingRoute;
    }

    findMatchingRoute(method: Method, path: SplitPath): RouterResponse {
        if (path.length === 0) {
            let matchingHandler = this.#findMatchingDirectHandler(method);
            if (this.#shouldReturn(matchingHandler)) return matchingHandler;

            matchingHandler = this.#keepResponseOfHigherPriority(
                matchingHandler,
                this.#findMatchingDynamicOptionalParsedGroup(method, path)
            );
            if (this.#shouldReturn(matchingHandler)) return matchingHandler;

            matchingHandler = this.#keepResponseOfHigherPriority(
                matchingHandler,
                this.#findMatchingDynamicOptionalGroup(method, path)
            );
            if (this.#shouldReturn(matchingHandler)) return matchingHandler;

            matchingHandler = this.#keepResponseOfHigherPriority(
                matchingHandler,
                this.#findMatchingOptionalWildcardParsedGroup(method, path)
            );
            if (this.#shouldReturn(matchingHandler)) return matchingHandler;

            matchingHandler = this.#keepResponseOfHigherPriority(
                matchingHandler,
                this.#findMatchingOptionalWildcardGroup(method, path)
            );
            if (this.#shouldReturn(matchingHandler)) return matchingHandler;

            return matchingHandler;
        }

        let matchingHandler = this.#findMatchingStaticGroup(method, path);
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingDynamicParsedGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingDynamicGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingDynamicOptionalParsedGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingDynamicOptionalGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingWildcardParsedGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingWildcardGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingOptionalWildcardParsedGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        matchingHandler = this.#keepResponseOfHigherPriority(
            matchingHandler,
            this.#findMatchingOptionalWildcardGroup(method, path)
        );
        if (this.#shouldReturn(matchingHandler)) return matchingHandler;

        return matchingHandler;
    }

    #findMatchingDirectHandler(method: Method): RouterResponse {
        if (!Object.keys(this.#handlers).length) {
            if (this.#wildcardMethodHandler)
                return {
                    type: RouterResponseType.Found,
                    route: this.#wildcardMethodHandler,
                    params: {},
                };

            return {
                type: RouterResponseType.NotFound,
            };
        }

        if (this.#handlers[method])
            return {
                type: RouterResponseType.Found,
                route: this.#handlers[method],
                params: {},
            };

        if (this.#wildcardMethodHandler)
            return {
                type: RouterResponseType.Found,
                route: this.#wildcardMethodHandler,
                params: {},
            };

        return {
            type: RouterResponseType.MatchingPathInvalidMethod,
            validMethods: Object.keys(this.#handlers),
        };
    }

    #findMatchingStaticGroup(method: Method, path: SplitPath): RouterResponse {
        const group = this.#staticGroups[path[0]!];
        if (!group)
            return {
                type: RouterResponseType.NotFound,
            };

        return group.findMatchingRoute(method, path.slice(1));
    }

    #findMatchingDynamicParsedGroup(
        method: Method,
        path: SplitPath
    ): RouterResponse {
        return this.#findDynamicMatchingParsedGroup(
            method,
            path,
            this.#dynamicParsedGroups
        );
    }

    #findMatchingDynamicGroup(method: Method, path: SplitPath): RouterResponse {
        return this.#findDynamicMatchingGroup(
            method,
            path,
            this.#dynamicGroups
        );
    }

    #findMatchingDynamicOptionalParsedGroup(
        method: Method,
        path: SplitPath
    ): RouterResponse {
        return this.#findDynamicMatchingParsedGroup(
            method,
            path,
            this.#dynamicOptionalParsedGroups
        );
    }

    #findMatchingDynamicOptionalGroup(
        method: Method,
        path: SplitPath
    ): RouterResponse {
        return this.#findDynamicMatchingGroup(
            method,
            path,
            this.#dynamicOptionalGroups
        );
    }

    #findMatchingWildcardParsedGroup(
        method: Method,
        path: SplitPath
    ): RouterResponse {
        return this.#findWildcardMatchingParsedGroup(
            method,
            path,
            this.#wildcardParsedGroups
        );
    }

    #findMatchingWildcardGroup(
        method: Method,
        path: SplitPath
    ): RouterResponse {
        if (!this.#wildcardGroup) return { type: RouterResponseType.NotFound };

        const matchingRoute = this.#wildcardGroup.group.findMatchingRoute(
            method,
            path.slice(1)
        );
        if (this.#shouldReturn(matchingRoute)) {
            matchingRoute.params["wildcard"] = path[0];

            return matchingRoute;
        }

        return matchingRoute;
    }

    #findMatchingOptionalWildcardParsedGroup(
        method: Method,
        path: SplitPath
    ): RouterResponse {
        return this.#findWildcardMatchingParsedGroup(
            method,
            path,
            this.#wildcardOptionalParsedGroups
        );
    }

    #findMatchingOptionalWildcardGroup(
        method: Method,
        path: SplitPath
    ): RouterResponse {
        if (!this.#wildcardOptionalGroup)
            return { type: RouterResponseType.NotFound };

        const matchingRoute =
            this.#wildcardOptionalGroup.group.findMatchingRoute(
                method,
                path.slice(1)
            );
        if (this.#shouldReturn(matchingRoute)) {
            matchingRoute.params["wildcard"] = path[0];

            return matchingRoute;
        }

        return matchingRoute;
    }
}

export class TrieRouter extends Router {
    #baseRouteGruop = new TrieRouterRouteGroup();

    override addRoute(route: RouteGroup<RouteContext>): void {
        const routes = (route as RouteGroupBuilder<RouteContext>).getRoutes();

        for (const route of routes) {
            this.#baseRouteGruop.addRoute(route);
        }
    }

    /** @internal */
    override findRoute(method: Method, path: Path): RouterResponse {
        return this.#baseRouteGruop.findMatchingRoute(method, splitPath(path));
    }
}

