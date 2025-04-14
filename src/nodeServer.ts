import { OnServerStartCallback, Server, ServerOptions } from "./server.js";
import http from "node:http";
import { Response } from "./response.js";
import { NodeBodyParser } from "./nodeBodyParser.js";

export class NodeServer extends Server {
    #server = http.createServer((req, res) => this.#handleRequest(req, res));
    #options: ServerOptions | undefined;

    protected override startServer(
        port: number,
        host: string,
        callback?: OnServerStartCallback
    ): void {
        this.#server.listen(port, host, callback);
    }

    #handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const method = req.method?.toLowerCase();
        const requestUrl = req.url;

        if (!method || !requestUrl) {
            res.end();
            return;
        }

        console.log(req.url, `http://${this.host!}:${this.port!}`);
        const url = new URL(requestUrl, `http://${this.host!}:${this.port!}`);

        //
        const bodyParser = new NodeBodyParser(req, this.#options!.bodyParser);
        const response = new Response();

        console.log("handeling req");
        // TODO: Update when i add validation
        this.handleRequest(
            bodyParser,
            method,
            url,
            req.headers as Record<string, string>,
            {},
            response
        );

        for (const [name, value] of Object.entries(response.sendingHeaders)) {
            res.setHeader(name, value);
        }

        console.log("done");

        res.writeHead(response.sendingStatus);
        res.end(response.sendingBody);
    }
}

