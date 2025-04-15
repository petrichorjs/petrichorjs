export type RouteDocumentationResponse = {
    description?: string;
    schema: any;
};

export type RouteDocumentation = {
    tags?: string[];
    summary: string;
    description?: string;
    responses: Record<number, RouteDocumentationResponse>;
};

