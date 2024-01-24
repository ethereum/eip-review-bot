import { generatePRTitle } from "./namePr";
import { eipNumber, isAsset, isProposal } from "./paths";
import { Config, File, FrontMatter, Octokit } from "./types";
import type { Repository } from "@octokit/webhooks-types";
import { PullRequest } from "@octokit/webhooks-types";
import crypto from "crypto";
import fm from "front-matter";
import yaml from "js-yaml";

function getGitBlobSha(content: string) {
    return crypto
        .createHash("sha1")
        .update(`blob ${content.length}\0${content}`)
        .digest("hex");
}

function generateEIPNumber(
    _octokit: Octokit,
    _repository: Repository,
    frontmatter: FrontMatter,
    file: File,
    isMerging: boolean = false,
): string {
    // Generate mnemonic name for draft EIPs or EIPs not yet about to be merged
    //if (frontmatter.status == 'Draft' || (frontmatter.status == 'Review' && !isMerging)) { // What I want to do
    if (!isMerging && frontmatter.status == "Draft" && file.status == "added") {
        // What I have to do
        let eip = frontmatter.title
            .split(/[^\w\d]+/)
            ?.join("_")
            .toLowerCase();
        // If there are trailing underscores, remove them
        while (eip.endsWith("_")) {
            eip = eip.slice(0, -1);
        }
        // If there are leading underscores, remove them
        while (eip.startsWith("_")) {
            eip = eip.slice(1);
        }
        // If the name is too long, truncate it
        if (eip.length > 30) {
            eip = eip.slice(0, 30);
        }
        return `draft_${eip}`;
    }

    // If filename already has an EIP number, use that
    if (isProposal(file)) {
        return eipNumber(file).toString();
    }

    throw new Error(
        `generating EIP numbers is not yet supported ('${file.filename}')`,
    );
}

async function updateFiles(
    octokit: Octokit,
    pull_request: PullRequest,
    oldFiles: File[],
    newFiles: File[],
) {
    const owner = pull_request.head.repo?.owner?.login as string;
    const repo = pull_request.head.repo?.name as string;
    const parentOwner = pull_request.base.repo?.owner?.login;
    const parentRepo = pull_request.base.repo?.name;
    const ref = `heads/${pull_request.head.ref}`;

    // Update all changed files
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
    // Add all new files
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
    // Delete all deleted files
    for (const file of oldFiles) {
        const removed = !newFiles.find((f) => f.filename == file.filename);
        if (!removed) {
            continue;
        }

        // Generate old file sha using blob API
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

    // For good measure, update the PR body (this also helps the bot to fail if there are any merge conflicts that somehow arose from the above)
    await octokit.rest.pulls.updateBranch({
        owner: parentOwner,
        repo: parentRepo,
        pull_number: pull_request.number,
    });

    // Return
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
    // Modify EIP data when needed

    let anyFilesChanged = false;

    const newFiles: File[] = [];
    const oldEipToNewEip: { [key: string]: string } = {};
    const re = /(?<=^content\/)[^/]+(?=(:?\.md|\/.+)$)/;

    for (let file of files) {
        file = { ...file };
        if (file.status == "removed") {
            continue; // Don't need to do stuff with removed files
        }

        // XXX: Sam modified the renaming logic to "work" with working groups,
        //      but because the code is disabled, it is untested. Here be
        //      dragons.
        if (isProposal(file)) {
            // Parse file
            const fileContent = file.contents;
            if (typeof fileContent !== "string") {
                throw new Error(`non-string contents in '${file.filename}'`);
            }

            const fileData = fm<FrontMatter>(fileContent);
            const frontmatter = fileData.attributes;

            // Check if EIP number needs setting
            const eip = generateEIPNumber(
                octokit,
                repository,
                frontmatter,
                file,
                isMerging,
            );

            const oldEip = frontmatter.eip;
            frontmatter.eip = `${eip}`;
            const paddedEip = frontmatter.eip.padStart(5, "0");
            const oldFilename = file.filename;
            file.filename = oldFilename.replace(re, paddedEip);

            if (oldFilename != file.filename || oldEip != eip) {
                anyFilesChanged = true;
                const oldFileMatch = oldFilename.match(re);
                if (!oldFileMatch) {
                    throw new Error(`file name missing id: '${oldFilename}'`);
                }
                oldEipToNewEip[oldFileMatch[0]] = paddedEip;

                // Retroactively update asset files
                for (let i = 0; i < newFiles.length; i++) {
                    if (
                        newFiles[i].filename.startsWith(
                            `content/${oldFileMatch[0]}`,
                        )
                    ) {
                        newFiles[i].filename = newFiles[i].filename.replace(
                            re,
                            paddedEip,
                        );
                    }
                }
            }

            // Check if status needs setting
            if (!frontmatter.status) {
                frontmatter.status = "Draft";

                anyFilesChanged = true;
            }

            // Check if last call deadline needs setting
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

            // Now, regenerate markdown from front matter
            let newYaml = yaml.dump(frontmatter, {
                // Ensure preamble is in the right order
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
                replacer: function (key, value: unknown) {
                    if (key == "eip" && Number.isInteger(value)) {
                        if (typeof value === "string") {
                            return parseInt(value); // Ensure that it's an integer
                        }
                    }
                    if (
                        key == "requires" &&
                        typeof value == "string" &&
                        !value.includes(",")
                    ) {
                        return parseInt(value); // Ensure that non-list requires aren't transformed into strings
                    }
                    if (key == "created" || key == "last-call-deadline") {
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
                // Generic options
                lineWidth: -1, // No max line width for preamble
                noRefs: true, // Disable YAML references
            });
            newYaml = newYaml.trim(); // Get rid of excess whitespace
            newYaml = newYaml.replaceAll("T00:00:00.000Z", ""); // Mandated date formatting by EIP-1

            // Regenerate file contents
            file.contents = `---\n${newYaml}\n---\n\n${fileData.body}`;

            // Push
            newFiles.push(file);
        } else if (isAsset(file)) {
            const oldFilename = file.filename;
            const oldFileMatch = oldFilename.match(re);
            if (!oldFileMatch) {
                throw new Error(`file name missing id: '${oldFilename}'`);
            }
            const eip = oldFileMatch[0];
            if (eip in oldEipToNewEip) {
                // Rename file
                file.filename = file.filename.replace(re, oldEipToNewEip[eip]);

                if (oldFilename != file.filename) {
                    anyFilesChanged = true;
                }
            }

            // Push
            newFiles.push(file);
        } else {
            newFiles.push(file);
        }
    }

    // Push changes
    // TODO: DISABLED FOR NOW
    // eslint-disable-next-line no-constant-condition
    if (false && anyFilesChanged) {
        pull_request = await updateFiles(
            octokit,
            pull_request,
            files,
            newFiles,
        );
    }

    // Update PR title
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

    // Return
    return pull_request;
}

export async function performMergeAction(
    octokit: Octokit,
    _: Config,
    repository: Repository,
    pull_request: PullRequest,
    files: File[],
) {
    // Make pre-merge changes
    pull_request = await preMergeChanges(
        octokit,
        _,
        repository,
        pull_request,
        files,
        true,
    );

    // If draft PR, return
    if (pull_request.draft) return;

    // Enable auto merge
    // Need to use GraphQL API to enable auto merge
    // https://docs.github.com/en/graphql/reference/mutations#enablepullrequestautomerge
    const response: unknown = await octokit.graphql(
        // There's a bug with Prettier that breaks the syntax highlighting for the rest of the file if I don't do indentation like this
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

    // Approve PR
    await octokit.rest.pulls.createReview({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_request.number,
        event: "APPROVE",
        body: "All Reviewers Have Approved; Performing Automatic Merge...",
    });
}
