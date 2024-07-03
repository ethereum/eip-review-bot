import { generatePRTitle } from "./namePr";
import { Config, File, FrontMatter, Octokit } from "./types";
import { Octokit as OctokitRest } from "@octokit/rest";
import type { Repository } from "@octokit/webhooks-types";
import { PullRequest } from "@octokit/webhooks-types";
import crypto from "crypto";
import fm from "front-matter";
import yaml from "js-yaml";

// Updated import

function getGitBlobSha(content: string) {
    return crypto
        .createHash("sha1")
        .update(`blob ${content.length}\0${content}`)
        .digest("hex");
}

export async function generateEIPNumber(
    octokit: Octokit,
    _repository: Repository,
    frontmatter: FrontMatter,
    file: File,
    isMerging: boolean = false,
): Promise<string> {
    if (!isMerging && frontmatter.status == "Draft" && file.status == "added") {
        let eip = frontmatter.title
            .split(/[^\w\d]+/)
            ?.join("_")
            .toLowerCase();
        while (eip.endsWith("_")) {
            eip = eip.slice(0, -1);
        }
        while (eip.startsWith("_")) {
            eip = eip.slice(1);
        }
        if (eip.length > 30) {
            eip = eip.slice(0, 30);
        }
        return `draft_${eip}`;
    }

    if (
        file.filename.startsWith("EIPS/eip-") ||
        file.filename.startsWith("ERCS/erc-")
    ) {
        const eip = file.filename.split("-")[1].split(".")[0];
        if (eip.match(/^\d+$/)) {
            return eip;
        }
    }

    const eipPathConfigs = [
        {
            owner: "ethereum",
            repo: "EIPs",
            path: "EIPS",
        },
        {
            owner: "ethereum",
            repo: "ERCs",
            path: "ERCS",
        },
    ];
    let eips: { name: string }[] = [];
    for (const eipPathConfig of eipPathConfigs) {
        const { data } = await octokit.rest.repos.getContent(eipPathConfig);
        eips = eips.concat(data as { name: string }[]);
    }

    const eipNumbers = eips
        .filter(
            (eip) => eip.name.startsWith("eip-") || eip.name.startsWith("erc-"),
        )
        .map((eip) => {
            try {
                return Number(eip.name.split("-")[1]);
            } catch {
                return 0;
            }
        });

    const eipNumber = Math.max(...eipNumbers);

    return (eipNumber + 1).toString();
}

async function updateFiles(
    octokit: Octokit,
    pull_request: PullRequest,
    oldFiles: File[],
    newFiles: File[],
) {
    const owner = pull_request.head.repo?.owner?.login as string;
    const repo = pull_request.head.repo?.name as string;
    const parentOwner = pull_request.base.repo?.owner?.login ?? ""; // Handle potential null value
    const parentRepo = pull_request.base.repo?.name ?? ""; // Handle potential null value
    const ref = `heads/${pull_request.head.ref}`;

    for (const file of newFiles) {
        const changed = !!oldFiles.find(
            (f) => f.filename == file.filename && f.contents != file.contents,
        );
        if (!changed) {
            continue;
        }

        const content = file.contents as string;
        const oldContent = oldFiles.find((f) => f.filename == file.filename)
            ?.contents as string;
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: owner,
            repo: repo,
            path: file.filename,
            message: `Update ${file.filename}`,
            content,
            sha: getGitBlobSha(oldContent),
            branch: ref,
        });
    }

    for (const file of newFiles) {
        const added = !oldFiles.find((f) => f.filename == file.filename);
        if (!added) {
            continue;
        }

        const content = file.contents as string;
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: owner,
            repo: repo,
            path: file.filename,
            message: `Add ${file.filename}`,
            content,
            branch: ref,
        });
    }

    for (const file of oldFiles) {
        const removed = !newFiles.find((f) => f.filename == file.filename);
        if (!removed) {
            continue;
        }

        const oldContent = file.contents as string;
        await octokit.rest.repos.deleteFile({
            owner: owner,
            repo: repo,
            path: file.filename,
            message: `Delete ${file.filename}`,
            sha: getGitBlobSha(oldContent),
            branch: ref,
        });
    }

    await octokit.rest.pulls.updateBranch({
        owner: parentOwner,
        repo: parentRepo,
        pull_number: pull_request.number,
    });

    return pull_request;
}

export async function preMergeChanges(
    octokit: Octokit,
    _: Config,
    repository: Repository,
    pull_request: PullRequest,
    files: File[],
    isMerging: boolean = false,
) {
    let anyFilesChanged = false;

    const newFiles: File[] = [];
    const oldEipToNewEip: { [key: string]: string } = {};
    for (let file of files) {
        file = { ...file };
        if (file.status == "removed") {
            continue;
        }
        if (file.filename.endsWith(".md")) {
            const fileContent = file.contents as string;
            const fileData = fm(fileContent);
            const frontmatter = fileData.attributes as FrontMatter;

            const eip = await generateEIPNumber(
                octokit,
                repository,
                frontmatter,
                file,
                isMerging,
            );

            const oldEip = frontmatter.eip;
            frontmatter.eip = `${eip}`;
            const oldFilename = file.filename;
            if (oldFilename.startsWith("EIPS/eip-")) {
                file.filename = `EIPS/eip-${eip}.md`;
            } else if (oldFilename.startsWith("ERCS/erc-")) {
                file.filename = `ERCS/erc-${eip}.md`;
            }

            if (oldFilename != file.filename || oldEip != eip) {
                anyFilesChanged = true;
                oldEipToNewEip[oldFilename.split("-")?.[1]] = file.filename;

                for (let i = 0; i < newFiles.length; i++) {
                    if (
                        newFiles[i].filename.startsWith(
                            `assets/eip-${oldFilename.split("-")?.[1]}`,
                        )
                    ) {
                        newFiles[i].filename = newFiles[i].filename.replace(
                            `eip-${oldFilename.split("-")?.[1]}`,
                            `eip-${eip}`,
                        );
                    }
                }
            }

            if (!frontmatter.status) {
                frontmatter.status = "Draft";

                anyFilesChanged = true;
            }

            if (
                frontmatter.status == "Last Call" &&
                !frontmatter["last-call-deadline"]
            ) {
                const fourteenDays = new Date(Date.now() + 12096e5);
                frontmatter["last-call-deadline"] = new Date(
                    `${fourteenDays.getUTCFullYear()}-${fourteenDays.getUTCMonth()}-${fourteenDays.getUTCDate()}`,
                );

                anyFilesChanged = true;
            }

            let shouldCheckDeadLine = false;

            if (frontmatter.status == "Last Call") {
                shouldCheckDeadLine = false;

                if (!frontmatter["last-call-deadline"]) {
                    const fourteenDays = new Date(Date.now() + 12096e5);
                    frontmatter["last-call-deadline"] = new Date(
                        `${fourteenDays.getUTCFullYear()}-${fourteenDays.getUTCMonth()}-${fourteenDays.getUTCDate()}`,
                    );

                    anyFilesChanged = true;
                } else {
                    shouldCheckDeadLine = true;
                }

                if (shouldCheckDeadLine) {
                    const octokitRest = new OctokitRest({
                        auth: process.env.GITHUB_ACCESS_TOKEN,
                    });

                    async function getLastCommitDate(filePath: string) {
                        const { data: commits } =
                            await octokitRest.repos.listCommits({
                                owner: "ethereum",
                                repo: "eip-review-bot",
                                path: filePath,
                                per_page: 1,
                            });

                        if (
                            commits.length > 0 &&
                            commits[0]?.commit?.committer?.date
                        ) {
                            return commits[0].commit.committer.date;
                        }

                        return null;
                    }

                    const lastCommitDate = await getLastCommitDate(
                        file.filename,
                    );
                    if (lastCommitDate) {
                        const lastCommitDateObj = new Date(lastCommitDate);
                        const twoWeeksFromLastCommit = new Date(
                            lastCommitDateObj.getTime() +
                                14 * 24 * 60 * 60 * 1000,
                        );

                        if (
                            frontmatter["last-call-deadline"] <
                            twoWeeksFromLastCommit
                        ) {
                            throw new Error(
                                "last-call-deadline is less than two weeks into the future from last commit date",
                            );
                        }
                    }

                    anyFilesChanged = true;
                }
            }

            let newYaml = yaml.dump(frontmatter, {
                sortKeys: function (a: unknown, b: unknown) {
                    if (typeof a !== "string" || typeof b !== "string") {
                        throw new Error("non-string while sorting YAML");
                    }

                    const preambleOrder = [
                        "eip",
                        "title",
                        "description",
                        "author",
                        "discussions-to",
                        "status",
                        "last-call-deadline",
                        "type",
                        "category",
                        "created",
                        "requires",
                        "withdrawal-reason",
                    ];
                    return preambleOrder.indexOf(a) - preambleOrder.indexOf(b);
                },
                // Ensure that dates and integers are not turned into strings
                replacer: function (key: string, value: any) {
                    if (
                        key === "eip" &&
                        typeof value === "string" &&
                        !isNaN(parseInt(value))
                    ) {
                        return parseInt(value, 10); // Ensure that it's an integer
                    }
                    if (
                        key === "requires" &&
                        typeof value === "string" &&
                        !value.includes(",")
                    ) {
                        return parseInt(value, 10); // Ensure that non-list requires aren't transformed into strings
                    }
                    if (key === "created" || key === "last-call-deadline") {
                        switch (typeof value) {
                            case "string":
                            case "number":
                                return new Date(value); // Ensure that it's a date object
                            case "object":
                                if (value instanceof Date) {
                                    return value;
                                }
                            // falls through
                            default:
                                throw new Error(`invalid value for "${key}"`);
                        }
                    }
                    return value;
                },
                lineWidth: -1, // No max line width for preamble
                noRefs: true, // Disable YAML references
            });
            newYaml = newYaml.trim();
            newYaml = newYaml.replaceAll("T00:00:00.000Z", "");

            file.contents = `---\n${newYaml}\n---\n\n${fileData.body}`;

            newFiles.push(file);
        } else if (file.filename.startsWith("assets/eip-")) {
            const oldFilename = file.filename;
            const eip = oldFilename.split("-")?.[1];
            if (eip in oldEipToNewEip) {
                file.filename = file.filename.replace(
                    `eip-${eip}`,
                    `eip-${oldEipToNewEip[eip].split("-")?.[1]}`,
                );

                if (oldFilename != file.filename) {
                    anyFilesChanged = true;
                }
            }

            newFiles.push(file);
        } else {
            newFiles.push(file);
        }
    }

    if (false && anyFilesChanged) {
        pull_request = await updateFiles(
            octokit,
            pull_request,
            files,
            newFiles,
        );
    }

    const newPRTitle = generatePRTitle(pull_request, newFiles);
    if (newPRTitle && newPRTitle != pull_request?.title) {
        await octokit.rest.pulls.update({
            owner: repository.owner.login,
            repo: repository.name,
            pull_number: pull_request.number,
            title: newPRTitle,
        });
        pull_request.title = newPRTitle;
    }

    return pull_request;
}

export async function performMergeAction(
    octokit: Octokit,
    _: Config,
    repository: Repository,
    pull_request: PullRequest,
    files: File[],
) {
    pull_request = await preMergeChanges(
        octokit,
        _,
        repository,
        pull_request,
        files,
        true,
    );

    if (pull_request.draft) return;

    const response: unknown = await octokit.graphql(
        `query GetPullRequestId($owner: String!, $repo: String!, $pullRequestNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                pullRequest(number: $pullRequestNumber) {
                    id
                }
            }
        }`,
        {
            owner: repository.owner.login,
            repo: repository.name,
            pullRequestNumber: pull_request.number,
        },
    );

    const pullRequestId =
        response &&
        typeof response === "object" &&
        "repository" in response &&
        response.repository &&
        typeof response.repository === "object" &&
        "pullRequest" in response.repository &&
        response.repository.pullRequest &&
        typeof response.repository.pullRequest === "object" &&
        "id" in response.repository.pullRequest &&
        response.repository.pullRequest.id;
    if (!pullRequestId) {
        console.error("missing pull request id", JSON.stringify(response));
        throw new Error("missing pull request id");
    }

    await octokit.graphql(
        `mutation EnableAutoMerge(
            $pullRequestId: ID!,
            $commitHeadline: String,
            $commitBody: String,
            $mergeMethod: PullRequestMergeMethod!,
        ) {
            enablePullRequestAutoMerge(input: {
                pullRequestId: $pullRequestId,
                commitHeadline: $commitHeadline,
                commitBody: $commitBody,
                mergeMethod: $mergeMethod,
            }) {
                pullRequest {
                    autoMergeRequest {
                        enabledAt
                        enabledBy {
                            login
                        }
                    }
                }
            }
        }`,
        {
            pullRequestId,
            commitHeadline: pull_request.title,
            commitBody: `Merged by EIP-Bot.`,
            mergeMethod: "SQUASH",
        },
    );

    await octokit.rest.pulls.createReview({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_request.number,
        event: "APPROVE",
        body: "All Reviewers Have Approved; Performing Automatic Merge...",
    });
}
