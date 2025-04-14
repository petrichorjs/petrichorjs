import { HttpError } from "./httpError.js";
import { statusCodes } from "./statusCodes.js";

export abstract class BodyParser {
    protected contentType: string;
    protected charset: string;

    constructor(contentType: string, charset: string) {
        this.contentType = contentType;
        this.charset = charset;
    }

    abstract body(): Promise<Buffer>;
    abstract text(): Promise<string>;
    // abstract parsedBody(): Promise<unknown>;

    protected createUnsupportedCharsetError(
        got: string,
        supported: string[]
    ): HttpError {
        return new HttpError(
            statusCodes.UnsupportedMediaType,
            `Unsupported charset '${got}'`,
            {
                "Accept-Charset": supported.join(", "),
            }
        );
    }
}

