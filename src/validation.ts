import { JoinOrChoose } from "./common.js";

export type Validator = () => unknown;

export type Validators = {
    body: Validator;
};

export type ValidatorsToValidated<T extends Validators> = {
    [K in keyof T]: T[K] extends Validator ? ReturnType<T[K]> : unknown;
};

export type Validated<Body = unknown> = {
    body: Body;
};

export type JoinValidators<T extends Validated, U extends Validated> = {
    body: JoinOrChoose<T["body"], U["body"]>;
};

