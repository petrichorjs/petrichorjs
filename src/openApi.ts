import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { ResponseDocumentation, Route } from "./routeGroup.js";
import { Path } from "./path.js";
import { splitPath } from "./router.js";
import { RouteValidators } from "./validation.js";
import { TObject, TSchema, Type } from "@sinclair/typebox";
import { ParamParserDocumented } from "./parse.js";

export type OpenApiDocumentationOptions = {
    info: OpenAPIV3_1.InfoObject;
    servers?: OpenAPIV3_1.ServerObject[];
};

type PathParam = {
    name: string;
    isOptional: boolean;
};

function pathToOpenApiPathAndParams(path: Path): {
    path: Path;
    params: PathParam[];
} {
    const parts = splitPath(path);
    const params: PathParam[] = [];

    const converted = parts.map((part) => {
        if (part.startsWith(":")) {
            const isOptional = part.endsWith("?");
            const name = part.slice(1, isOptional ? -1 : undefined);

            params.push({
                name: name,
                isOptional: isOptional,
            });

            return `{${name}}`;
        } else if (part.startsWith("*")) {
            const isOptional = part.endsWith("?");

            params.push({
                name: "wildcard",
                isOptional: isOptional,
            });

            return "wildcard";
        }

        return part;
    });

    return {
        path: `/${converted.join("/")}`,
        params: params,
    };
}

function validatorObjectSchemaToParameters(
    type: "query" | "header" | "cookie",
    objectSchema: TObject
): OpenAPIV3_1.ParameterObject[] {
    const parameters: OpenAPIV3_1.ParameterObject[] = [];

    for (const [name, value] of Object.entries(objectSchema.properties)) {
        const {
            description,
            params: _a,
            readOnly: _b,
            static: _c,
            title: _d,
            writeOnly: _e,
            ...schema
        } = value;

        //@ts-ignore Idk why
        parameters.push({
            in: type,
            name: name,
            schema: schema,
            required: objectSchema.required?.includes(name) || false,
            description: description,
        });
    }

    return parameters;
}

function validatorsToParameters(
    validators: RouteValidators,
    parsers: Record<string, ParamParserDocumented<TSchema>>,
    params: PathParam[]
): OpenAPIV3_1.ParameterObject[] {
    const pathParams: OpenAPIV3_1.ParameterObject[] = params.map((param) => {
        const parser = parsers[param.name];
        if (!parser) {
            return {
                in: "path",
                name: param.name,
                required: !param.isOptional,
            } satisfies OpenAPIV3_1.ParameterObject;
        }

        return {
            in: "path",
            name: param.name,
            schema: parser.validator,
            required: !param.isOptional,
            description: parser.documentation.description,
        } satisfies OpenAPIV3_1.ParameterObject;
    });

    const queryParams = validatorObjectSchemaToParameters(
        "query",
        Type.Composite(validators.query)
    );
    const cookieParams = validatorObjectSchemaToParameters(
        "cookie",
        Type.Composite(validators.cookies)
    );
    const headerParams = validatorObjectSchemaToParameters(
        "header",
        Type.Composite(validators.headers)
    );

    return [...pathParams, ...queryParams, ...cookieParams, ...headerParams];
}

function responsesToOpenApi(
    responses: Record<number, ResponseDocumentation<TSchema>>
): OpenAPIV3.ResponsesObject & OpenAPIV3_1.ResponsesObject {
    const openApiResponses: OpenAPIV3.ResponsesObject &
        OpenAPIV3_1.ResponsesObject = {};

    for (const [code, response] of Object.entries(responses)) {
        const {
            description,
            params: _a,
            readOnly: _b,
            static: _c,
            title: _d,
            writeOnly: _e,
            ...schema
        } = response.schema;

        const contentType =
            response.contentType || schema["type"] === "string"
                ? "text/plain"
                : "application/json";

        openApiResponses[code.toString()] = {
            description: response.description || description || "",
            content: {
                [contentType]: {
                    schema: schema,
                },
            },
        };
    }

    return openApiResponses;
}

function routesToOpenApiDocs(routes: Route[]): OpenAPIV3_1.PathsObject {
    const transformedRoutes: OpenAPIV3_1.PathsObject = {};

    for (const route of routes) {
        if (!route.documentation) continue;
        const { path, params } = pathToOpenApiPathAndParams(route.path);

        if (!transformedRoutes[path]) transformedRoutes[path] = {};
        const transformedRoute = transformedRoutes[path]!;

        for (const method of route.methods ||
            Object.values(OpenAPIV3.HttpMethods)) {
            //@ts-ignore
            transformedRoute[method as OpenAPIV3.HttpMethods] = {
                tags: route.documentation.tags || [],
                summary: route.documentation.summary,
                description: route.documentation.description,
                operationId: route.documentation.operationId,
                parameters: validatorsToParameters(
                    route.validators,
                    route.parsers,
                    params
                ),
                responses: responsesToOpenApi(route.documentation.responses),
            };
        }
    }

    return transformedRoutes;
}

export function generateOpenApiDocs(
    options: OpenApiDocumentationOptions,
    routes: Route[]
) {
    //@ts-ignore
    const doc: OpenAPIV3_1.Document = {
        openapi: "3.0.4",
        info: options.info,
        servers: options.servers,
        paths: routesToOpenApiDocs(routes),
    };

    return doc;
}

