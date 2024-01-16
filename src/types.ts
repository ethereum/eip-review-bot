import core from "@actions/core";

export declare type Remote = {
    owner: string;
    repo: string;
    ref: string;
};

export declare type File = {
    sha?: string;
    status:
        | "removed"
        | "modified"
        | "renamed"
        | "added"
        | "copied"
        | "changed"
        | "unchanged";
    filename: string;
    previous_filename?: string | undefined;
    contents?: string | undefined;
    previous_contents?: string | undefined;
    target_remote: Remote;
    source_remote: Remote;
};

export declare type Octokit = import("@octokit/core/dist-types").Octokit &
    import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api & {
        paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
    };

export declare type Rule = {
    /**
     * The name of the rule
     */
    name: string;

    /**
     * The list of GitHub usernames (case insensitive) that are needed to satisfy the rule
     */
    reviewers: string[];

    /**
     * The minumum number of reviewers needed to satisfy the rule
     */
    min: number;

    /**
     * The annotation to be displayed on the PR if the rule is not satisfied
     */
    annotation: core.AnnotationProperties;

    /**
     * Whether the PR author approves the PR by default
     */
    pr_approval?: boolean | undefined;

    /**
     * The labels to add to the PR if the rule is not satisfied, or remove if the rule is satisfied
     */
    labels?: string[] | undefined;

    /**
     * The labels to not add the PR if the rule is not satisfied
     */
    exclude_labels?: string[] | undefined;
};
export declare type RuleProcessed = Rule & { label_min: number };
export declare type RuleGenerator = (
    octokit: Octokit,
    config: Config,
    files: File[],
) => Promise<Rule[]>;
export declare type Config = { [key: string]: string[] };
export declare type FrontMatter = {
    "last-call-deadline": Date;
    created: Date;
} & { [key: string]: string };
