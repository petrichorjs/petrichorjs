import { JoinOrChoose } from "./common.js";

export type Validated<Body = unknown> = Partial<{
    body: Body;
}>;

export type JoinValidators<T extends Validated, U extends Validated> = {
    body: JoinOrChoose<T["body"], U["body"]>;
};

