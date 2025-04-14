import { BodyParser } from "./bodyParser.js";
import { JoinParsedAndPathParams } from "./parse.js";
import { Methods, Route, RouteContext } from "./routeGroup.js";

export class Request<Context extends RouteContext, M extends Methods | null> {
    #bodyParser: BodyParser;

    readonly params: JoinParsedAndPathParams<
        Context["path"],
        Context["parsedParams"]
    >;
    readonly handlerPath: Context["path"];
    readonly method: M extends Methods ? M[number] : Methods[number];
    readonly url: URL;
    readonly headers: Record<string, string>;
    readonly locals: Context["locals"];
    readonly query: Context["validated"]["query"];
    readonly cookies: Context["validated"]["cookies"];

    // async body(): Promise<Context["validated"]["body"]> {
    //     return await this.#bodyParser.parsedBody();
    // }

    async text(): Promise<string> {
        return await this.#bodyParser.text();
    }

    constructor(
        bodyParser: BodyParser,
        params: JoinParsedAndPathParams<
            Context["path"],
            Context["parsedParams"]
        >,
        route: Route,
        method: M extends Methods ? M[number] : Methods[number],
        url: URL,
        headers: Record<string, string>,
        locals: Context["locals"],
        query: Context["validated"]["query"],
        cookies: Context["validated"]["cookies"]
    ) {
        this.#bodyParser = bodyParser;

        this.params = params;
        this.handlerPath = route.path;
        this.method = method;
        this.url = url;
        this.headers = headers;
        this.locals = locals;
        this.query = query;
        this.cookies = cookies;
    }
}

