import { StatusCode } from "./statusCodes.js";

export class HttpError extends Error {
    readonly status: StatusCode;
    #message: string;
    #headers: Record<string, string> | undefined;
    #data: unknown | undefined;

    constructor(
        status: StatusCode,
        message: string,
        headers?: Record<string, string>,
        data?: unknown | undefined
    ) {
        super(`Http error: ${status} - ${message}`);

        this.status = status;
        this.#message = message;
        this.#headers = headers;
        this.#data = data;
    }

    toJsonResponse() {
        return {
            message: this.#message,
            data: this.#data,
        };
    }

    getHeaders(): Record<string, string> {
        return this.#headers || {};
    }
}

