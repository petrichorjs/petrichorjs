import { HttpError } from "./httpError.js";
import { Router, RouterResponseType } from "./router.js";
import { StatusCode, statusCodes } from "./statusCodes.js";
import { Request } from "./request.js";
import { Response } from "./response.js";
import { Method } from "./routeGroup.js";
import { Path } from "./path.js";
import {
    BodyParser,
    BodyParserOptions,
    defaultBodyParserOptions,
} from "./bodyParser.js";
import { RecursivePartial } from "./common.js";

export type ServerOptions = {
    bodyParser: BodyParserOptions;
};

export type OnServerStartCallback = () => void;

export function defaultServerOptions(
    options: RecursivePartial<ServerOptions> | undefined
): ServerOptions {
    return {
        bodyParser: defaultBodyParserOptions(options?.bodyParser),
    };
}

export abstract class Server {
    protected router: Router;
    protected port: number | undefined;
    protected host: string | undefined;
    protected options: ServerOptions;

    constructor(router: Router, options: RecursivePartial<ServerOptions>) {
        this.router = router;
        this.options = defaultServerOptions(options);
    }

    listen(port: number, host: string, callback?: OnServerStartCallback): void {
        this.port = port;
        this.host = host;

        this.startServer(port, host, callback);
    }

    protected createNotFoundError(): HttpError {
        return new HttpError(statusCodes.NotFound, "Not found");
    }

    protected createMethodNotAllowedError(allowedMethods: string[]): HttpError {
        return new HttpError(
            statusCodes.MethodNotAllowed,
            "Method not allowed",
            {
                Allow: allowedMethods
                    .map((method) => method.toUpperCase())
                    .join(", "),
            }
        );
    }

    protected async handleRequest(
        bodyParser: BodyParser,
        method: Method,
        url: URL,
        headers: Record<string, string>,
        cookies: Record<string, string>,
        response: Response<StatusCode, unknown>
    ): Promise<void> {
        const handler = this.router.findRoute(method, url.pathname as Path);

        try {
            if (handler.type === RouterResponseType.NotFound)
                throw this.createNotFoundError();
            else if (
                handler.type === RouterResponseType.MatchingPathInvalidMethod
            ) {
                response.header("Allow", handler.validMethods.join(", "));
                throw this.createMethodNotAllowedError(handler.validMethods);
            }

            // TODO: update when i add validation
            const request = new Request(
                bodyParser,
                handler.params,
                handler.route,
                method,
                url,
                headers,
                {},
                cookies,
                {}
            );

            // TODO: Run middleware and local functions!
            // Handler should not return anything, other than for type inference.
            handler.route.handler({
                request: request,
                response: response,
            });
        } catch (err) {
            if (err instanceof HttpError) {
                response
                    .headers(err.getHeaders())
                    .status(err.status)
                    .json(err.toJsonResponse());
                return;
            }

            response
                .status(statusCodes.InternalServerError)
                .json({ message: "Internal server error" });
        }
    }

    protected abstract startServer(
        port: number,
        host: string,
        callback?: OnServerStartCallback
    ): void;
}

