import { Mix, Prettify } from "./common.js";
import { LocalFunction, Locals } from "./locals.js";
import { JoinValidators, Validated } from "./validation.js";

export type PluginContext<
    L extends Locals = Locals,
    V extends Validated = Validated,
> = {
    locals: L;
    validated: V;
};

export type AddPluginContextValidators<
    Context extends PluginContext,
    V extends Validated,
> = PluginContext<Context["locals"], JoinValidators<Context["validated"], V>>;

export type AddPluginContextLocals<
    Context extends PluginContext,
    L extends Locals,
> = PluginContext<
    Mix<Omit<Context["locals"], keyof L> & L>,
    Context["validated"]
>;

export interface PluginValidators<Context extends PluginContext>
    extends PluginMiddleware<Context> {
    validate<T extends Validated>(
        validators: T
    ): PluginMiddleware<Prettify<AddPluginContextValidators<Context, T>>>;
}

export interface PluginMiddleware<Context extends PluginContext>
    extends Plugin<Context> {
    before<T extends LocalFunction>(
        handler: T
    ): PluginMiddleware<
        Prettify<AddPluginContextLocals<Context, ReturnType<T>>>
    >;
}

export type Plugin<_Context extends PluginContext> = {};

