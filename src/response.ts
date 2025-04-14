import { CookieOptions } from "./cookies.js";
import { StatusCode, statusCodes } from "./statusCodes.js";

export class Response<S extends StatusCode, B extends unknown> {
    /** @internal */
    sendingStatus: StatusCode = statusCodes.Ok;

    /** @internal */
    sendingBody: string | undefined;

    /** @internal */
    sendingHeaders: Record<string, string> = {};

    /** @internal */
    sendingCookies: Record<
        string,
        {
            value: string;
            options: Partial<CookieOptions> | undefined;
        }
    > = {};

    header(name: string, value: string): this {
        this.sendingHeaders[name] = value;

        return this;
    }

    headers(headers: Record<string, string>): this {
        for (const [name, value] of Object.entries(headers)) {
            this.header(name, value);
        }

        return this;
    }

    cookie(
        name: string,
        value: string,
        options?: Partial<CookieOptions>
    ): this {
        this.sendingCookies[name] = {
            value: value,
            options: options,
        };

        return this;
    }

    status<T extends StatusCode>(statusCode: T): Response<T, B> {
        this.sendingStatus = statusCode;

        return this as unknown as Response<T, B>;
    }

    text(body: string): Record<S, string> {
        this.sendingBody = body;
        this.header("Content-Type", "text/plain");

        return {} as Record<S, string>;
    }

    html(body: string): Record<S, string> {
        this.sendingBody = body;
        this.header("Content-Type", "text/html");

        return {} as Record<S, string>;
    }

    json<T>(body: T): Record<S, T> {
        this.sendingBody = JSON.stringify(body);
        this.header("Content-Type", "application/json");

        return {} as Record<S, T>;
    }
}

