import busboy from "busboy";
import { BodyParser, BodyParserOptions, Charset } from "./bodyParser.js";
import { IncomingMessage } from "node:http";
import { NodeTemporaryFile } from "./nodeTemporaryFile.js";
import { TemporaryFile } from "./temporaryFile.js";
import * as qs from "qs";

export class NodeBodyParser extends BodyParser {
    #request: IncomingMessage;
    #collectedBody: Buffer | undefined;
    #collectedMultipart: unknown | undefined;
    #temporaryFiles: TemporaryFile[] = [];

    constructor(request: IncomingMessage, options: BodyParserOptions) {
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

        super(contentType, charset, options);

        this.#request = request;
    }

    override async rawBody(): Promise<Buffer> {
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
        const body = await this.rawBody();
        if (body.length > this.options.text.limit)
            throw this.createRequestBodyTooLargeError();

        // Have already checked that it is a valid charset
        return body.toString(this.charset as Charset);
    }

    override async json(): Promise<unknown> {
        const body = await this.rawBody();
        if (body.length > this.options.json.limit)
            throw this.createRequestBodyTooLargeError();

        const bodyString = body.toString(this.charset as Charset);

        let data;
        try {
            data = JSON.parse(bodyString);
        } catch {
            throw this.createUnprocessableJsonError();
        }

        return data;
    }

    override async multipart(): Promise<unknown> {
        if (this.#request.readableEnded && !this.#collectedMultipart)
            throw new Error(
                "Request body has already been consumed by other body parser handler"
            );

        if (this.#collectedMultipart) return this.#collectedMultipart;

        return new Promise((resolve, reject) => {
            const formData: Record<string, unknown> = {};

            const bb = busboy({
                headers: this.#request.headers,
            });

            let filesCount = 0;
            let fieldsCount = 0;
            let totalSize = 0;

            bb.on("file", (name, file, info) => {
                filesCount += 1;
                if (filesCount > this.options.multipart.maxFileCount) {
                    file.destroy();
                    bb.destroy();

                    reject(this.createTooManyMultipartFileFieldsError());
                } else if (
                    fieldsCount + filesCount >
                    this.options.multipart.maxTotalFieldsCount
                ) {
                    file.destroy();
                    bb.destroy();

                    reject(this.createTooManyMultipartFieldsError());
                }

                const temporaryFile = new NodeTemporaryFile(
                    info.mimeType,
                    info.filename,
                    info.encoding
                );
                formData[name] = temporaryFile;
                this.#temporaryFiles.push(temporaryFile);

                const writeStream = temporaryFile.getWriteStream();
                let fileSize = 0;

                file.on("data", (chunk: Buffer) => {
                    fileSize += chunk.length;
                    totalSize += chunk.length;

                    if (fileSize > this.options.multipart.maxFileSize) {
                        file.destroy();
                        bb.destroy();

                        reject(this.createTooLargeMultipartFileError());
                    } else if (
                        totalSize > this.options.multipart.maxTotalFileSize
                    ) {
                        file.destroy();
                        bb.destroy();

                        reject(this.createRequestBodyTooLargeError());
                    }

                    writeStream.write(chunk);
                });

                file.on("close", () => {
                    writeStream.close();
                });
            });

            bb.on("field", (name, value, _info) => {
                fieldsCount += 1;
                if (
                    fieldsCount + filesCount >
                    this.options.multipart.maxTotalFieldsCount
                ) {
                    bb.destroy();

                    reject(this.createTooManyMultipartFieldsError());
                }

                formData[name] = value;
            });

            bb.on("close", () => {
                resolve(qs.parse(formData as Record<string, string>));
            });
        });
    }

    override cleanup(): void {
        for (const temporaryFile of this.#temporaryFiles) {
            temporaryFile.cleanup();
        }

        this.#temporaryFiles = [];
    }
}

