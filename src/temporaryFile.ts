import { ReadStream, WriteStream } from "node:fs";

export abstract class TemporaryFile {
    readonly type: string;
    readonly filename: string;
    readonly encoding: string;

    constructor(type: string, filename: string, encoding: string) {
        this.type = type;
        this.filename = filename;
        this.encoding = encoding;
    }

    abstract cleanup(): void;

    /** @internal */
    abstract getWriteStream(): WriteStream;

    abstract getReadStream(): ReadStream;
}

