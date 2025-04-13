/**
 * -> Path -> Parsed params -> Locals -> Validated things <- Routes (path,
 * params, validated body (+ other), responses)
 */

import { Mix, Prettify } from "./common.js";
import { LocalFunction, Locals } from "./locals.js";
import {
    ParsedParams,
    ParseParamFunctions,
    ParseParamFunctionsToParsedParams,
} from "./parse.js";
import { joinPaths, JoinPaths, Path } from "./path.js";
import { Plugin, PluginBuilder, PluginContext } from "./plugin.js";
import {
    joinRouteValidators,
    JoinValidators,
    RouteValidators,
    Validated,
    Validators,
    validatorsToRouteValidators,
    ValidatorsToValidated,
} from "./validation.js";

export type Method = "get" | "post" | "put" | "patch" | "delete" | string;
export type Methods = Method[];

export type RouteHandler<
    _M extends Methods,
    _Context extends RouteContext,
> = (data: { request: any; response: any }) => any;

export type Responses = Record<number, unknown>;

export type Route = {
    path: Path;
    methods: Method[];
    parsers: ParseParamFunctions<Path, ParsedParams>;
    validators: RouteValidators;
    middleware: Middleware[];
    handler: RouteHandler<Methods, RouteContext>;
};

export type ChildRoute<
    P extends Path = Path,
    M extends Methods = Methods,
    Params extends ParsedParams = ParsedParams,
    R extends Responses = Responses,
> = {
    path: P;
    methods: M;
    parsedParams: Params;
    responses: R;
};
export type ChildRoutes = ChildRoute[];

export type RouteContext<
    P extends Path = Path,
    Params extends ParsedParams = ParsedParams,
    L extends Locals = Locals,
    V extends Validated = Validated,
    C extends ChildRoutes = ChildRoutes,
> = {
    path: P;
    parsedParams: Params;
    locals: L;
    validated: V;
    childRoutes: C;
};

export type AddRouteContextParsedParams<
    Context extends RouteContext,
    Params extends ParsedParams,
> = RouteContext<
    Context["path"],
    Mix<Context["parsedParams"] & Params>,
    Context["locals"],
    Context["validated"],
    Context["childRoutes"]
>;

export type AddRouteContextValidators<
    Context extends RouteContext,
    V extends Validated,
> = RouteContext<
    Context["path"],
    Context["parsedParams"],
    Context["locals"],
    JoinValidators<Context["validated"], V>,
    Context["childRoutes"]
>;

export type AddRouteContextLocals<
    Context extends RouteContext,
    L extends Locals,
> = RouteContext<
    Context["path"],
    Context["parsedParams"],
    Mix<Omit<Context["locals"], keyof L> & L>,
    Context["validated"],
    Context["childRoutes"]
>;

export type AddRouteContextPlugin<
    Context extends RouteContext,
    P extends PluginContext,
> = RouteContext<
    Context["path"],
    Context["parsedParams"],
    Mix<Omit<Context["locals"], keyof P["locals"]> & P["locals"]>,
    JoinValidators<Context["validated"], P["validated"]>,
    Context["childRoutes"]
>;

export type AddRouteContextChildRoute<
    Context extends RouteContext,
    R extends ChildRoute,
> = RouteContext<
    Context["path"],
    Context["parsedParams"],
    Context["locals"],
    Context["validated"],
    Mix<[R, ...Context["childRoutes"]]>
>;

export type AddRouteContextChildRoutes<
    Context extends RouteContext,
    R extends ChildRoute[],
> = RouteContext<
    Context["path"],
    Context["parsedParams"],
    Context["locals"],
    Context["validated"],
    Mix<[...R, ...Context["childRoutes"]]>
>;

export type MiddlewareFunction = () => void;

export enum MiddlewareType {
    Middleware,
    Local,
}

export type Middleware =
    | {
          type: MiddlewareType.Middleware;
          handler: MiddlewareFunction;
      }
    | {
          type: MiddlewareType.Local;
          handler: LocalFunction;
      };

export type Handler = {
    path: Path;
    method: Method;
    handler: RouteHandler<Method[], RouteContext>;
};

export interface RouteGroupUse<Context extends RouteContext>
    extends RouteGroupParser<Context> {
    use<T extends Plugin<PluginContext>>(
        plugin: T
    ): T extends Plugin<infer U extends PluginContext>
        ? RouteGroupUse<Prettify<AddRouteContextPlugin<Context, U>>>
        : never;
}

export interface RouteGroupParser<Context extends RouteContext>
    extends RouteGroupValidators<Context> {
    parse<
        T extends Prettify<
            Partial<
                ParseParamFunctions<Context["path"], Context["parsedParams"]>
            >
        >,
    >(
        parsers: T
    ): RouteGroupValidators<
        Prettify<
            AddRouteContextParsedParams<
                Context,
                ParseParamFunctionsToParsedParams<T>
            >
        >
    >;
}

export interface RouteGroupValidators<Context extends RouteContext>
    extends RouteGroupMiddleware<Context> {
    validate<T extends Validators>(
        validators: Partial<T>
    ): RouteGroupMiddleware<
        Prettify<AddRouteContextValidators<Context, ValidatorsToValidated<T>>>
    >;
}

export interface RouteGroupMiddleware<Context extends RouteContext>
    extends RouteGroupGroups<Context> {
    before<T extends LocalFunction>(
        handler: T
    ): RouteGroupMiddleware<
        Prettify<AddRouteContextLocals<Context, ReturnType<T>>>
    >;
    middleware(handler: MiddlewareFunction): RouteGroupMiddleware<Context>;
}

export interface RouteGroupGroups<Context extends RouteContext>
    extends RouteGroupHandlers<Context> {
    group<C extends RouteContext>(
        group: RouteGroup<C>
    ): RouteGroupGroups<
        Prettify<AddRouteContextChildRoutes<Context, C["childRoutes"]>>
    >;
}

export interface RouteGroupHandlers<Context extends RouteContext>
    extends RouteGroup<Context> {
    on<P extends Path, M extends Method, H extends RouteHandler<[M], Context>>(
        path: P,
        method: M,
        handler: H
    ): RouteGroupHandlers<
        Prettify<
            AddRouteContextChildRoute<
                Context,
                ChildRoute<
                    JoinPaths<Context["path"], P>,
                    [M],
                    Context["parsedParams"],
                    Awaited<ReturnType<H>>
                >
            >
        >
    >;
}

export type RouteGroup<_Context extends RouteContext> = {};

// type A = ParseParamFunctionsToParsedParams<ParseParamFunctions<"/:a/:b", {}>>;
// type B = RouteContext<"/a/:d", {}, {}, Validated, []>;
// type B2 = Partial<Prettify<ParseParamFunctions<B["path"], B["parsedParams"]>>>;
// type C = RouteGroupUse<B>;
// type D = ParseParamFunctions<B["path"], B["parsedParams"]>;
// type E = B["parsedParams"];

// const d: D = {
//     d: (a) => a,
// };

export class RouteGroupBuilder<Context extends RouteContext>
    implements RouteGroupUse<Context>
{
    #basePath: Path;

    #plugins: PluginBuilder<PluginContext>[] = [];
    #parsers: ParseParamFunctions<Path, {}> = {};
    #validators: Partial<Validators> = {};
    #middleware: Middleware[] = [];
    #groups: RouteGroupBuilder<RouteContext>[] = [];
    #handlers: Handler[] = [];

    constructor(basePath: Path) {
        this.#basePath = basePath;
    }

    use<T extends Plugin<PluginContext>>(plugin: T) {
        this.#plugins.push(plugin as unknown as PluginBuilder<PluginContext>);

        return this as unknown as T extends Plugin<
            infer U extends PluginContext
        >
            ? RouteGroupUse<Prettify<AddRouteContextPlugin<Context, U>>>
            : never;
    }

    parse<
        T extends Prettify<
            Partial<
                ParseParamFunctions<Context["path"], Context["parsedParams"]>
            >
        >,
    >(parsers: T) {
        this.#parsers = parsers;

        return this;
    }

    validate<T extends Validators>(validators: Partial<T>) {
        this.#validators = validators;

        return this;
    }

    before<T extends LocalFunction>(handler: T) {
        this.#middleware.push({
            type: MiddlewareType.Local,
            handler: handler,
        });

        return this;
    }

    middleware(handler: MiddlewareFunction) {
        this.#middleware.push({
            type: MiddlewareType.Middleware,
            handler: handler,
        });

        return this;
    }

    group<C extends RouteContext>(group: RouteGroup<C>) {
        this.#groups.push(group as RouteGroupBuilder<RouteContext>);

        return this;
    }

    on<P extends Path, M extends Method, H extends RouteHandler<[M], Context>>(
        path: P,
        method: M,
        handler: H
    ) {
        this.#handlers.push({
            path: path,
            method: method,
            handler: handler,
        });

        return this;
    }

    getRoutes(): Route[] {
        const routes: Route[] = [];

        for (const group of this.#groups) {
            const groupRoutes = group.getRoutes();

            for (const route of groupRoutes) {
                route.path = joinPaths(this.#basePath, route.path);
                route.parsers = Object.assign({}, this.#parsers, route.parsers);
                route.validators = joinRouteValidators(
                    this.#validators,
                    route.validators
                );
                route.middleware = [...this.#middleware, ...route.middleware];
            }

            routes.push(...groupRoutes);
        }

        for (const handler of this.#handlers) {
            routes.push({
                path: joinPaths(this.#basePath, handler.path),
                methods: [handler.method],
                parsers: this.#parsers,
                validators: validatorsToRouteValidators(this.#validators),
                middleware: this.#middleware,
                handler: handler.handler,
            });
        }

        return routes;
    }
}

// declare const c: C;
// c.parse({
//     d: (data) => parseInt(data),
// })
//     .group(new RouteGroupBuilder<B>("/abc").)
//     .on("/abc", "post", () => {
//         return "anc";
//     });

