import core from "@actions/core";

export declare type File = {
    sha?: string;
    filename: string;
    status: "removed" | "modified" | "renamed" | "added" | "copied" | "changed" | "unchanged";
    additions?: number; 
    deletions?: number;
    changes?: number;
    blob_url?: string;
    raw_url?: string;
    contents_url?: string;
    patch?: string | undefined;
    previous_filename?: string | undefined;
    contents?: string | undefined;
    previous_contents?: string | undefined;
};

export declare type Octokit = import("@octokit/core/dist-types").Octokit & import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
};

export declare type Config = { [key: string]: string[] };
export declare type FrontMatter = { [key: string]: string | undefined };
export declare type Rule = { name: string; reviewers: string[]; min: number; annotation?: core.AnnotationProperties | undefined; };
export declare type RuleGenerator = ((octokit: Octokit, config: Config, files: File[]) => Promise<Rule[]>);

