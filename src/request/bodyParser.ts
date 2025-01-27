import { HttpError } from "../error.js";
import { statusCodes } from "../response/statusCode.js";

export enum BodyParserContentType {
    Text,
    Json,
    Multipart,
}

/** The options for body parsers */
export type BodyParserOptions = {
    text: {
        limit: number;
        contentTypes: Set<string>;
        encoding: BufferEncoding;
    };
    json: {
        limit: number;
        contentTypes: Set<string>;
        encoding: BufferEncoding;
        convertEmptyStringsToNull: boolean;
    };
    multipart: {
        limit: number;
        contentTypes: Set<string>;
        encoding: BufferEncoding;
        maxFileSize: number;
    };
};

type ContentTypeOptions = BodyParserOptions[keyof BodyParserOptions];

export type ParsedTextBody = string;
export type ParsedJsonBody = unknown;
export type ParsedMultipartValue =
    | {
          isFile: false;
          headers: Map<string, string>;
          value: string;
      }
    | {
          isFile: true;
          headers: Map<string, string>;
          filename: string;
          mediaType: string;
          size: number;
          localFilePath: string;
      };
export type ParsedMultipartBody = Map<string, ParsedMultipartValue>;
export type ParsedMultipartBodyEntries = [string, ParsedMultipartValue][];

export type ParsedRequestBody = ParsedTextBody | ParsedJsonBody;

export function defaultBodyParserOptions(
    options: Partial<BodyParserOptions>
): BodyParserOptions {
    return {
        text: {
            limit: options.text?.limit || 1000000, // 1 MB
            contentTypes:
                options.text?.contentTypes ||
                new Set(["text/plain", "text/html"]),
            encoding: options.text?.encoding || "utf-8",
        },
        json: {
            limit: options.json?.limit || 1000000, // 1 MB
            contentTypes:
                options.json?.contentTypes || new Set(["application/json"]),
            encoding: options.json?.encoding || "utf-8",
            convertEmptyStringsToNull:
                options.json?.convertEmptyStringsToNull || true,
        },
        multipart: {
            limit: options.json?.limit || 10000000, // 10 MB
            contentTypes:
                options.json?.contentTypes || new Set(["multipart/form-data"]),
            encoding: options.multipart?.encoding || "utf-8",
            maxFileSize: options.multipart?.maxFileSize || 5000000, // 5 MB
        },
    };
}

/**
 * The body parser is used by the request to collect and parse the body. It
 * should also validate it.
 */
export abstract class BodyParser {
    readonly contentType: BodyParserContentType;
    protected readonly contentTypeOptions: ContentTypeOptions;

    protected parsedBody: ParsedRequestBody | undefined;

    constructor(
        protected readonly options: BodyParserOptions,
        contentTypeHeader: string | undefined
    ) {
        this.contentType = this.getRequestContentType(contentTypeHeader);
        this.contentTypeOptions = this.getContentTypeOptions();
    }

    /** @internal */
    abstract cleanup(): void;

    protected abstract handleTextRequest(): Promise<ParsedTextBody>;
    protected abstract handleJsonRequest(): Promise<ParsedJsonBody>;
    protected abstract handleMultipartRequest(): Promise<ParsedMultipartBodyEntries>;

    async body(): Promise<ParsedRequestBody> {
        if (this.parsedBody) return this.parsedBody;

        switch (this.contentType) {
            case BodyParserContentType.Text:
                this.parsedBody = await this.handleTextRequest();
                break;
            case BodyParserContentType.Json:
                this.parsedBody = await this.handleJsonRequest();
                break;
            case BodyParserContentType.Multipart:
                this.parsedBody = await this.handleMultipartRequest();
                break;
        }

        return this.parsedBody;
    }

    protected getRequestContentType(
        contentTypeHeader: string | undefined
    ): BodyParserContentType {
        if (!contentTypeHeader) return BodyParserContentType.Text;

        const contentTypeHeaderParts = contentTypeHeader.split(";");
        const contentType = contentTypeHeaderParts[0];
        if (!contentType) return BodyParserContentType.Text;

        if (this.options.json.contentTypes.has(contentType)) {
            return BodyParserContentType.Json;
        } else if (this.options.multipart.contentTypes.has(contentType)) {
            return BodyParserContentType.Multipart;
        }

        return BodyParserContentType.Text;
    }

    protected getContentTypeOptions(): ContentTypeOptions {
        switch (this.contentType) {
            case BodyParserContentType.Text:
                return this.options.text;
            case BodyParserContentType.Json:
                return this.options.json;
            case BodyParserContentType.Multipart:
                return this.options.multipart;
        }
    }

    protected createMissingContentLengthError(): HttpError {
        return new HttpError(
            statusCodes.LengthRequired,
            "The Content-Length header is required!"
        );
    }

    protected createMissmatchedContentLengthError(): HttpError {
        return new HttpError(
            statusCodes.UnprocessableContent,
            "Missmatched Content-Length header and actual body content length!"
        );
    }

    protected createBodyTooBigError(): HttpError {
        return new HttpError(
            statusCodes.UnprocessableContent,
            "The body is too large!"
        );
    }

    protected createInvalidMultipart(): HttpError {
        return new HttpError(
            statusCodes.UnprocessableContent,
            "Invalid multipart body!"
        );
    }
}

