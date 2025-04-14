export interface CookieOptions {
    domain: string;
    expires: Date;
    httpOnly: boolean;
    maxAge: number;
    partitioned: boolean;
    path: string;
    sameSite: "Strict" | "Lax" | "None";
    secure: boolean;
}

export function cookieToString(
    name: string,
    value: string,
    options?: Partial<CookieOptions>
): string {
    let optionsString = "";
    if (options) {
        optionsString += options.domain ? `; Domain=${options.domain}` : "";
        optionsString += options.expires ? `; Expires=${options.expires}` : "";
        optionsString += options.httpOnly ? `; HttpOnly` : "";
        optionsString += options.maxAge ? `; MaxAge=${options.maxAge}` : "";
        optionsString += options.partitioned ? `; Partitioned` : "";
        optionsString += options.path ? `; Path=${options.path}` : "";
        optionsString += options.sameSite
            ? `; SameSite=${options.sameSite}`
            : "";
        optionsString += options.secure ? `; Secure` : "";
    }

    return `${name}=${value}${optionsString}`;
}

