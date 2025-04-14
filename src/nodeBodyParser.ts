import { BodyParser } from "./bodyParser.js";
import { IncomingMessage } from "node:http";

const validBufferEncodings = [
    "ascii",
    "utf8",
    "utf-8",
    "utf16le",
    "utf-16le",
    "ucs2",
    "ucs-2",
    "base64",
    "base64url",
    "latin1",
    "binary",
    "hex",
];

export class NodeBodyParser extends BodyParser {
    #request: IncomingMessage;
    #collectedBody: Buffer | undefined;

    constructor(request: IncomingMessage) {
        let contentTypeHeader =
            request.headers["Content-Type"] || request.headers["content-type"];
        let contentType: string;
        let charset: string;

        if (Array.isArray(contentTypeHeader))
            contentTypeHeader = contentTypeHeader[0];

        if (!contentTypeHeader) {
            contentType = "text/plain";
            charset = "utf-8";
        } else {
            const splitContentType = contentTypeHeader.split(";");
            contentType = splitContentType[0] || "text/plain";
            charset =
                contentTypeHeader.match(/charset=([^\s]+)/)?.[1] || "utf-8";
        }

        super(contentType, charset);

        this.#request = request;
    }

    #isValidBufferEncoding(encoding: string): encoding is BufferEncoding {
        return validBufferEncodings.includes(encoding);
    }

    override async body(): Promise<Buffer> {
        if (this.#collectedBody) return this.#collectedBody;

        return new Promise((resolve, reject) => {
            const collectedChunks: Uint8Array[] = [];

            this.#request.on("data", (chunk) => {
                collectedChunks.push(chunk);
            });

            this.#request.on("end", () => {
                const result = Buffer.concat(collectedChunks);
                this.#collectedBody = result;
                resolve(result);
            });

            this.#request.on("error", (err) => {
                reject(err);
            });
        });
    }

    override async text(): Promise<string> {
        const body = await this.body();

        if (!this.#isValidBufferEncoding(this.charset))
            throw this.createUnsupportedCharsetError(
                this.charset,
                validBufferEncodings
            );

        return body.toString(this.charset);
    }
}
