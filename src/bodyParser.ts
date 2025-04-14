import { RecursivePartial } from "./common.js";
import { HttpError } from "./httpError.js";
import { statusCodes } from "./statusCodes.js";

const validCharsets = [
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
] as const;

export type Charset = (typeof validCharsets)[number];

export type BodyParserOptions = {
    validCharsets: Charset[];
    /**
     * If to throw a {@link HttpError} if no matching handler (text, json or
     * multipart) is found that handles that content type. If `false` the data
     * will be parsed as text.
     */
    throwOnInvalidContentType: boolean;
    text: {
        contentTypes: string[];
        limit: number;
    };
    json: {
        contentTypes: string[];
        limit: number;
        convertEmptyStringsToNull: boolean;
    };
    multipart: {
        contentTypes: string[];
        /** The maximum total size of all the field values combined. */
        maxTotalFileSize: number;
        /** Allowed mime file types. `null` allows all file mime types. */
        fileTypes: string[] | null;
        maxFileSize: number;
        maxFieldSize: number;
        maxFileCount: number;
        maxTotalFieldsCount: number;
    };
};

export function defaultBodyParserOptions(
    options: RecursivePartial<BodyParserOptions> | undefined
): BodyParserOptions {
    return {
        validCharsets:
            options?.validCharsets || (validCharsets as unknown as Charset[]),
        throwOnInvalidContentType:
            options?.throwOnInvalidContentType === undefined
                ? true
                : options?.throwOnInvalidContentType,
        text: {
            contentTypes: options?.text?.contentTypes || [
                "text/plain",
                "text/html",
            ],
            limit: options?.text?.limit || 1000000,
        },
        json: {
            contentTypes: options?.json?.contentTypes || ["application/json"],
            limit: options?.json?.limit || 1000000,
            convertEmptyStringsToNull:
                options?.json?.convertEmptyStringsToNull === undefined
                    ? true
                    : options?.json?.convertEmptyStringsToNull,
        },
        multipart: {
            contentTypes: options?.multipart?.contentTypes || [
                "multipart/form-data",
            ],
            maxTotalFileSize: options?.multipart?.maxTotalFileSize || 10000000,
            fileTypes: options?.multipart?.fileTypes || null,
            maxFileSize: options?.multipart?.maxFileSize || 5000000,
            maxFieldSize: options?.multipart?.maxFieldSize || 1000000,
            maxFileCount: options?.multipart?.maxFileCount || 10,
            maxTotalFieldsCount: options?.multipart?.maxTotalFieldsCount || 100,
        },
    };
}

export abstract class BodyParser {
    protected contentType: string;
    protected charset: string;
    protected options: BodyParserOptions;

    constructor(
        contentType: string,
        charset: string,
        options: BodyParserOptions
    ) {
        this.contentType = contentType.toLowerCase();
        this.charset = charset.toLowerCase();
        this.options = options;
    }

    abstract rawBody(): Promise<Buffer>;
    abstract text(): Promise<string>;
    abstract json(): Promise<unknown>;
    abstract multipart(): Promise<unknown>;
    abstract cleanup(): void;

    async parsedBody(): Promise<unknown> {
        if (!this.options.validCharsets.includes(this.charset as Charset))
            throw this.createUnsupportedCharsetError(
                this.charset,
                this.options.validCharsets
            );

        if (this.options.json.contentTypes.includes(this.contentType))
            return await this.json();
        else if (this.options.multipart.contentTypes.includes(this.contentType))
            return await this.multipart();

        if (
            this.options.throwOnInvalidContentType &&
            !this.options.text.contentTypes.includes(this.contentType)
        )
            throw this.createUnsupportedContentTypeError(this.contentType);

        return await this.text();
    }

    protected isValidBufferEncoding(
        encoding: string
    ): encoding is BufferEncoding {
        return validCharsets.includes(encoding as Charset);
    }

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

    protected createUnsupportedContentTypeError(got: string): HttpError {
        return new HttpError(
            statusCodes.UnsupportedMediaType,
            `Unsupported content type '${got}'`
        );
    }

    protected createUnprocessableJsonError(): HttpError {
        return new HttpError(
            statusCodes.UnprocessableContent,
            "Unable to parse JSON body"
        );
    }

    protected createTooManyMultipartFieldsError(): HttpError {
        return new HttpError(
            statusCodes.PayloadTooLarge,
            "Too many multipart fileds"
        );
    }

    protected createTooManyMultipartFileFieldsError(): HttpError {
        return new HttpError(
            statusCodes.PayloadTooLarge,
            "Too many multipart files"
        );
    }

    protected createTooLargeMultipartFileError(): HttpError {
        return new HttpError(
            statusCodes.PayloadTooLarge,
            "Too large multipart file"
        );
    }

    protected createTooLargeMultipartFieldError(): HttpError {
        return new HttpError(
            statusCodes.PayloadTooLarge,
            "Too large multipart field"
        );
    }

    protected createRequestBodyTooLargeError(): HttpError {
        return new HttpError(
            statusCodes.PayloadTooLarge,
            "Request body is too large"
        );
    }

    protected createInvalidMultipartError(): HttpError {
        return new HttpError(
            statusCodes.PayloadTooLarge,
            "Invalid form multipart body"
        );
    }

    protected createInvalidMultipartFileTypeError(got: string): HttpError {
        return new HttpError(
            statusCodes.UnsupportedMediaType,
            `Invalid multipart form filed file type '${got}'`
        );
    }
}

