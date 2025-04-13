import { Path } from "./path.js";
import { PathParams } from "./pathParams.js";

export type ParsedParams = Record<string, unknown>;

export type ParseParamFunction<T> = (
    param: T,
    unparseable: typeof unparseableParam
) => unknown;

export type ParseParamFunctions<
    P extends Path,
    AlreadyParsed extends ParsedParams,
> = {
    [K in keyof Omit<PathParams<P>, keyof AlreadyParsed>]: ParseParamFunction<
        PathParams<P>[K]
    >;
};
export type ParseParamFunctionsToParsedParams<
    Functions extends ParseParamFunctions<Path, ParsedParams>,
> = {
    [K in keyof Functions]: Functions[K] extends (...args: any) => any
        ? ReturnType<Functions[K]>
        : undefined;
};

export class UnparseableParamError extends Error {
    constructor() {
        super("Unparseable param");
    }
}

export function unparseableParam(): never {
    throw new UnparseableParamError();
}

