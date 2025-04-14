import { FileResult, fileSync } from "tmp";
import { TemporaryFile } from "./temporaryFile.js";
import { createReadStream, createWriteStream, WriteStream } from "node:fs";
import { ReadStream } from "fs";

export class NodeTemporaryFile extends TemporaryFile {
    #file: FileResult;

    constructor(type: string, filename: string, encoding: string) {
        super(type, filename, encoding);

        this.#file = fileSync();
    }

    override cleanup(): void {
        this.#file.removeCallback();
    }

    override getWriteStream(): WriteStream {
        return createWriteStream(this.#file.name);
    }

    override getReadStream(): ReadStream {
        return createReadStream(this.#file.name);
    }
}

