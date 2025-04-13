import { Mix, Prettify } from "./common.js";
import { LocalFunction, Locals } from "./locals.js";
import { Middleware, MiddlewareType } from "./routeGroup.js";
import {
    JoinValidators,
    Validated,
    Validators,
    ValidatorsToValidated,
} from "./validation.js";

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
    validate<T extends Validators>(
        validators: T
    ): PluginMiddleware<
        Prettify<AddPluginContextValidators<Context, ValidatorsToValidated<T>>>
    >;
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

export class PluginBuilder<Context extends PluginContext>
    implements PluginValidators<Context>
{
    validators: Partial<Validators> = {};
    middleware: Middleware[] = [];

    validate<T extends Validators>(validators: T) {
        this.validators = validators;

        return this;
    }

    before<T extends LocalFunction>(handler: T) {
        this.middleware.push({
            type: MiddlewareType.Local,
            handler: handler,
        });

        return this;
    }
}

