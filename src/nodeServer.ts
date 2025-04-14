import { Server } from "./server.js";
import http from "node:http";
import { Response } from "./response.js";
import { NodeBodyParser } from "./nodeBodyParser.js";

export class NodeServer extends Server {
    #server = http.createServer(this.#handleRequest);

    override startServer(port: number): never {
        this.#server.listen(port);

        throw "";
    }

    #handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const method = req.method;
        const requestUrl = req.url;

        if (!method || !requestUrl) {
            res.end();
            return;
        }

        const url = new URL(requestUrl);

        const bodyParser = new NodeBodyParser(req);
        const response = new Response();

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

        res.writeHead(response.sendingStatus);
        res.end(response.sendingBody);
    }
}
