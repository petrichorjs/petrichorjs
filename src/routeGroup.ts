/**
 * -> Path -> Parsed params -> Locals -> Validated things <- Routes (path,
 * params, validated body (+ other), responses)
 */

import { JoinOrChoose, Mix, Prettify } from "./common.js";
import { LocalFunction, Locals } from "./locals.js";
import {
    ParsedParams,
    ParseParamFunctions,
    ParseParamFunctionsToParsedParams,
} from "./parse.js";
import { Path } from "./path.js";
import { PathParams } from "./pathParams.js";
import { Plugin, PluginContext } from "./plugin.js";
import { JoinValidators, Validated } from "./validation.js";

export type Responses = Record<number, unknown>;

export type ChildRoute<
    P extends Path = Path,
    Params extends ParsedParams = ParsedParams,
    V extends Validated = Validated,
    R extends Responses = Responses,
> = {
    path: P;
    parsedParams: Params;
    validated: V;
    responses: R;
};
export type ChildRoutes = Record<Path, ChildRoute>;

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

export type MiddlewareFunction = () => void;
export type HandlerFunction = () => unknown;

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
    validate<T extends Validated>(
        validators: T
    ): RouteGroupMiddleware<Prettify<AddRouteContextValidators<Context, T>>>;
}

export interface RouteGroupMiddleware<Context extends RouteContext>
    extends RouteGroup<Context> {
    before<T extends LocalFunction>(
        handler: T
    ): RouteGroupMiddleware<
        Prettify<AddRouteContextLocals<Context, ReturnType<T>>>
    >;
    middleware(handler: MiddlewareFunction): RouteGroupMiddleware<Context>;
}

export type RouteGroup<_Context extends RouteContext> = {};

type A = ParseParamFunctionsToParsedParams<ParseParamFunctions<"/:a/:b", {}>>;
type B = RouteContext<"/a/:d", {}, {}, {}, {}>;
type B2 = Partial<Prettify<ParseParamFunctions<B["path"], B["parsedParams"]>>>;
type C = RouteGroupUse<B>;
type D = ParseParamFunctions<B["path"], B["parsedParams"]>;
type E = B["parsedParams"];

// declare const c: C;
// c.parse({
//     d: (data) => parseInt(data)
// }).

const d: D = {
    d: (a) => a,
};

