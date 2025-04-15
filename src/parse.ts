import { Prettify } from "./common.js";
import { Path } from "./path.js";
import { PathParams } from "./pathParams.js";
import { TSchema, Static } from "@sinclair/typebox";

export type ParsedParams = Record<string, unknown>;

export type JoinParsedAndPathParams<
    P extends Path,
    T extends ParsedParams,
> = Prettify<T & Omit<PathParams<P>, keyof T>>;

export type ParamParsersDocumented<
    P extends Path,
    AlreadyParsed extends ParsedParams,
> = {
    [K in keyof Omit<
        PathParams<P>,
        keyof AlreadyParsed
    >]: ParamParserDocumented<TSchema>;
};

export type ParamParsersToParsedParams<
    Parsers extends ParamParsersDocumented<Path, ParsedParams>,
> = {
    [K in keyof Parsers]: Parsers[K] extends ParamParserDocumented<infer T>
        ? Static<T>
        : undefined;
};

export type ParamParserDocumentation = {
    description: string;
};

export type ParamParserDocumented<T extends TSchema> = {
    validator: T;
    documentation: ParamParserDocumentation;
};

export type ParamParser<T extends TSchema> = (
    description: string
) => ParamParserDocumented<T>;

export function paramParser<T extends TSchema>(validator: T): ParamParser<T> {
    return (description: string) => ({
        validator: validator,
        documentation: {
            description: description,
        },
    });
}

