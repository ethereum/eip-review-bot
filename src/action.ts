import { performMergeAction, preMergeChanges } from "./merge.js";
import processFiles from "./process.js";
import { File, RuleProcessed } from "./types.js";
import core from "@actions/core";
import github from "@actions/github";
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { throttling } from "@octokit/plugin-throttling";
import {
    PullRequest,
    PullRequestEvent,
    Repository,
} from "@octokit/webhooks-types";
import { exec } from "child_process";
import fs from "fs/promises";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import os from "os";
import path from "path";
import { parse } from "yaml";

const unknown = "<unknown>";

// Initialize GitHub API
const GITHUB_TOKEN = core.getInput("token");
const ThrottledOctokit = GitHub.plugin(throttling);
const octokit = new ThrottledOctokit(
    getOctokitOptions(GITHUB_TOKEN, {
        throttle: {
            onRateLimit: (retryAfter, options) => {
                // TODO: Fix typing for options
                core.warning(
                    `Request quota exhausted for request ${
                        options?.method || unknown
                    } ${options?.url || unknown}`,
                );
                if (options?.request?.retryCount <= 2) {
                    core.notice(`Retrying after ${retryAfter} seconds!`);
                    return true;
                }
            },
            onSecondaryRateLimit: (_retryAfter, options) =>
                core.error(
                    `Abuse detected for request ${options?.method || unknown} ${
                        options?.url || unknown
                    }`,
                ),
        },
    }),
);

async function run() {
    // Deconstruct the payload
    const payload = github.context.payload as Partial<PullRequestEvent>; // Partial since it might be ran from a non pull_request event
    const repository = payload.repository as Repository; // Guaranteed to be present no matter the event
    let pull_request = payload.pull_request as PullRequest;
    let pull_number = pull_request?.number;
    if (!pull_number) {
        // If ran from a non pull_request event, fetch necessary data
        core.info(
            "Detected non pull_request_target configuration. Fetching data.",
        );
        pull_number = parseInt(core.getInput("pr_number"));
        const pull_request_response = await octokit.rest.pulls.get({
            owner: repository.owner.login,
            repo: repository.name,
            pull_number,
        });
        if (pull_request_response.status !== 200) {
            core.setFailed(
                `Could not fetch data for Pull Request ${repository.owner.login}/${repository.name}#${pull_number}`,
            );
            process.exit(4);
        }
        pull_request = pull_request_response.data as PullRequest;
        pull_request.number = pull_number; // To make sure there is DEFINITELY a pull_number
    } else {
        core.info(
            "Detected pull_request_target configuration. Using GitHub-provided data.",
        );
    }
    core.info(
        `Running eip-review-bot on ${repository.owner.login}/${repository.name}#${pull_number} by "@${pull_request?.user?.login}"`,
    );

    // If PR is already merged, exit
    if (pull_request.merged) {
        core.info("Pull Request is already merged. Exiting.");
        process.exit(0);
    }

    // Get comment info
    const me = await octokit.rest.users.getAuthenticated();
    const comments = await octokit.rest.issues.listComments({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pull_number,
    });

    let previous_comment = comments.data.find(
        (comment) => comment?.user?.login == me.data.login,
    );
    if (previous_comment) {
        previous_comment = (
            await octokit.rest.issues.updateComment({
                owner: repository.owner.login,
                repo: repository.name,
                comment_id: previous_comment.id,
                body: "EIP Review Bot is running...",
            })
        ).data;
    } else {
        previous_comment = (
            await octokit.rest.issues.createComment({
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: pull_number,
                body: "EIP Review Bot is running...",
            })
        ).data;
    }

    // Top level try/catch to handle errors
    try {
        // If PR doesn't have "allow edits from maintainers" enabled, error
        if (
            !pull_request?.maintainer_can_modify &&
            repository.owner.login != pull_request.base.repo.owner.login
        ) {
            const body =
                '❌ PR does not have "Allow edits from maintainers" enabled. This is required for the EIP Review Bot to function. Please enable it.';
            previous_comment = (
                await octokit.rest.issues.updateComment({
                    owner: repository.owner.login,
                    repo: repository.name,
                    comment_id: previous_comment.id,
                    body,
                })
            ).data;
            core.setFailed(
                'PR does not have "Allow edits from maintainers" enabled. Please enable it.',
            );
            process.exit(5);
        }

        // Clone the repository into a temporary directory
        core.info("Cloning repository and fetching required data...");
        const cloneDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "eip-review-bot-"),
        );
        core.info(`Cloning into ${cloneDir}`);
        // This shouldn't work. But it does. And is by far the most reliable way to do this.
        core.info(
            `Cloning from ${
                pull_request.head.repo?.clone_url || repository.clone_url
            } at ref ${pull_request.head.ref}`,
        );
        await git.clone({
            fs,
            http,
            dir: cloneDir,
            url: pull_request.head.repo?.clone_url || repository.clone_url,
            remote: "pr",
            ref: pull_request.head.ref,
            singleBranch: true,
        });
        if (pull_request.head.ref != "pr") {
            await git.renameBranch({
                fs,
                dir: cloneDir,
                oldref: pull_request.head.ref,
                ref: "pr",
            });
        }
        core.info(
            `Cloning from ${repository.clone_url} at ref ${repository.default_branch}`,
        );
        await git.clone({
            fs,
            http,
            dir: cloneDir,
            url: repository.clone_url,
            remote: "main",
            ref: repository.default_branch,
            singleBranch: true,
        });
        if (repository.default_branch != "main") {
            await git.renameBranch({
                fs,
                dir: cloneDir,
                oldref: repository.default_branch,
                ref: "main",
            });
        }

        // Get info that we need for later
        const mainBranchCommitOid = await git.resolveRef({
            fs,
            dir: cloneDir,
            ref: "main",
        });
        const prBranchCommitOid = await git.resolveRef({
            fs,
            dir: cloneDir,
            ref: "pr",
        });
        const { commit: mainBranchCommit } = await git.readCommit({
            fs,
            dir: cloneDir,
            oid: mainBranchCommitOid,
        });
        const prBranchWalker = git.TREE({ ref: prBranchCommitOid });

        // Find most recent common ancestor between main and pr branches by walking back the commit tree
        core.info("Finding common ancestor...");
        // Fetch the common ancestor commit and its data
        // TODO: Use the MRCA ancestor algorithm instead of running git merge-base through a shell
        const commonAncestorCommitOid = await new Promise<string>(
            (resolve, reject) => {
                exec(
                    `git merge-base --octopus main pr`,
                    { cwd: cloneDir },
                    (error, stdout, stderr) => {
                        if (error) {
                            reject(error);
                        } else if (stderr) {
                            reject(stderr);
                        } else {
                            resolve(stdout.trim().split("\n")[0]);
                        }
                    },
                );
            },
        );
        const commonAncestorWalker = git.TREE({ ref: commonAncestorCommitOid });

        core.info("Parsing data...");
        const textDecoder = new TextDecoder();
        // Pull and parse config file ('.wg/reviewers.yml') from main branch of main repository using only isomorphic-git (no fs)
        let config = undefined as { [key: string]: string[] } | undefined;
        try {
            const configFilePath = core.getInput("config") || ".wg/reviewers.yml";
            const configFilePathSplit = configFilePath.split("/");
            let configOid: string | undefined = mainBranchCommit.tree;
            for (const path of configFilePathSplit) {
                if (path == "") continue;
                configOid = (
                    await git.readTree({ fs, dir: cloneDir, oid: configOid })
                ).tree.find((value) => value.path == path)?.oid;
                if (!configOid) {
                    previous_comment = (
                        await octokit.rest.issues.updateComment({
                            owner: repository.owner.login,
                            repo: repository.name,
                            comment_id: previous_comment.id,
                            body: `❌ Could not find config file at \`${configFilePath}\`. Please ensure that the config file exists in the repository.`,
                        })
                    ).data;
                    core.setFailed(`Could not find file "${configFilePath}"`);
                    process.exit(3);
                }
            }
            const { blob: configBlob } = await git.readBlob({
                fs,
                dir: cloneDir,
                oid: configOid,
            });
            const configText = textDecoder.decode(configBlob);
            config = parse(configText) as { [key: string]: string[] };
            core.info(`Raw config object: ${JSON.stringify(config, null, 2)}`);
        } catch (e) {
            previous_comment = (
                await octokit.rest.issues.updateComment({
                    owner: repository.owner.login,
                    repo: repository.name,
                    comment_id: previous_comment.id,
                    body: `❌ Could not parse config file. Please ensure that the config file is valid YAML.`,
                })
            ).data;
            core.setFailed(`Could not parse config file`);
            process.exit(3);
        }
        if (!config) {
            previous_comment = (
                await octokit.rest.issues.updateComment({
                    owner: repository.owner.login,
                    repo: repository.name,
                    comment_id: previous_comment.id,
                    body: `❌ Could not parse config file. Please ensure that the config file is valid YAML.`,
                })
            ).data;
            core.setFailed(`Could not parse config file`);
            process.exit(3);
        }
        config = config as { [key: string]: string[] };

        const source_remote = {
            owner:
                pull_request.head.repo?.owner.login || repository.owner.login,
            repo: pull_request.head.repo?.name || repository.name,
            ref: prBranchCommitOid,
        };

        const target_remote = {
            owner: repository.owner.login,
            repo: repository.name,
            ref: mainBranchCommitOid,
        };

        // Get diff between common ancestor and pr branch trees
        core.info("Generating PR diff...");
        const files = (
            (await git.walk({
                fs,
                dir: cloneDir,
                trees: [commonAncestorWalker, prBranchWalker],
                map: async function (
                    filepath,
                    [commonAncestorEntry, prBranchEntry],
                ): Promise<File | undefined> {
                    if (prBranchEntry == null && commonAncestorEntry == null) {
                        return undefined;
                    }
                    if (commonAncestorEntry == null) {
                        // File was added
                        const contentRaw =
                            (await prBranchEntry?.content()) ||
                            new Uint8Array();
                        return {
                            sha: await prBranchEntry?.oid(),
                            status: "added",
                            filename: filepath,
                            previous_filename: undefined,
                            contents: textDecoder.decode(contentRaw),
                            previous_contents: undefined,
                            target_remote,
                            source_remote,
                        };
                    } else if (prBranchEntry == null) {
                        // File was removed
                        const contentRaw =
                            (await commonAncestorEntry?.content()) ||
                            new Uint8Array();
                        return {
                            sha: await commonAncestorEntry?.oid(),
                            status: "removed",
                            filename: filepath,
                            previous_filename: undefined,
                            contents: undefined,
                            previous_contents: textDecoder.decode(contentRaw),
                            target_remote,
                            source_remote,
                        };
                    } else {
                        // File was modified
                        const contentRaw =
                            (await prBranchEntry?.content()) ||
                            new Uint8Array();
                        const previous_contentRaw =
                            (await commonAncestorEntry?.content()) ||
                            new Uint8Array();
                        // Raw type array equality checking is scuffed, so we have to do this
                        if (
                            contentRaw.length == previous_contentRaw.length &&
                            contentRaw.every(
                                (value, index) =>
                                    value == previous_contentRaw[index],
                            )
                        ) {
                            return undefined;
                        }
                        return {
                            sha: await prBranchEntry?.oid(),
                            status: "modified",
                            filename: filepath,
                            previous_filename: filepath,
                            contents: textDecoder.decode(contentRaw),
                            previous_contents:
                                textDecoder.decode(previous_contentRaw),
                            target_remote,
                            source_remote,
                        };
                    }
                },
            })) as (File | undefined)[]
        ).filter((file) => file != undefined) as File[];
        core.info(`Raw file object: ${JSON.stringify(files, null, 2)}`);

        core.info("Processing files...");
        // Get rule results
        let result = (await processFiles(octokit, config, files)).map(
            (ruleog): RuleProcessed => {
                const rule = ruleog as RuleProcessed;
                rule.reviewers = rule.reviewers.map((reviewer) =>
                    reviewer.toLowerCase(),
                );
                rule.min = Math.min(rule.min, rule.reviewers.length);
                rule.label_min = rule.min;
                return rule;
            },
        );
        core.info(`Raw result object: ${JSON.stringify(result, null, 2)}`);

        // Set the output
        let approvedBy = new Set<string>();

        // Add PR author as reviewer when applicable
        result = result.map((rule: RuleProcessed): RuleProcessed => {
            if (
                rule.pr_approval &&
                rule.reviewers.includes(
                    pull_request?.user?.login?.toLowerCase(),
                )
            ) {
                core.info(
                    `PR Author "@${pull_request?.user?.login}" matched rule "${rule.name}" (PR Author Approval Enabled)`,
                );
                rule.min = rule.min - 1;
                rule.label_min = rule.label_min - 1;
            } else {
                core.info(
                    `PR Author "@${pull_request?.user?.login}" did not match rule "${rule.name}" (PR Author Approval Disabled)`,
                );
            }
            return rule;
        });
        approvedBy.add(pull_request?.user?.login);

        // Add proper reviewers as reviewers
        const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
            owner: repository.owner.login,
            repo: repository.name,
            pull_number,
        });
        for (const review of reviews) {
            if (review.user?.login) {
                if (review.state == "APPROVED") {
                    approvedBy.add(review.user?.login);
                }
                result = result.map((rule: RuleProcessed): RuleProcessed => {
                    if (review.state == "APPROVED") {
                        if (
                            rule.reviewers.includes(
                                review.user?.login?.toLowerCase() as string,
                            )
                        ) {
                            core.info(
                                `Review by "@${pull_request?.user?.login}" matched rule "${rule.name}"`,
                            );
                            rule.min = rule.min - 1;
                        } else {
                            core.info(
                                `Review by "@${pull_request?.user?.login}" did not match rule "${rule.name}"`,
                            );
                        }
                    }
                    if (
                        rule.reviewers.includes(
                            review.user?.login?.toLowerCase() as string,
                        ) &&
                        ["APPROVE", "REQUEST_CHANGES", "COMMENT"].includes(
                            review.state,
                        ) &&
                        review.commit_id == pull_request.head.sha
                    ) {
                        rule.label_min = rule.label_min - 1;
                    }
                    return rule;
                });
            }
        }

        // Make reviewers all lowercase
        approvedBy = new Set(
            Array.from(approvedBy).map((reviewer) => reviewer.toLowerCase()),
        );

        // Remove all rules that were satisfied, and all active reviewers
        let labels_to_add: Set<string> = new Set();
        let labels_to_remove: Set<string> = new Set();
        const labels_to_not_add: Set<string> = new Set();
        result = result
            .filter((rule) => {
                if (rule.label_min <= 0) {
                    if (rule.labels) {
                        for (const label of rule.labels) {
                            core.info(
                                `Label "${label}" was removed by rule "${rule.name}"`,
                            );
                            labels_to_remove.add(label);
                        }
                    }
                } else {
                    if (rule.labels) {
                        for (const label of rule.labels) {
                            core.info(
                                `Label "${label}" was added by rule "${rule.name}"`,
                            );
                            labels_to_add.add(label);
                        }
                    }
                    if (rule.exclude_labels) {
                        for (const label of rule.exclude_labels) {
                            core.info(
                                `Label "${label}" was excluded by rule "${rule.name}"`,
                            );
                            labels_to_not_add.add(label);
                        }
                    }
                }
                if (rule.min <= 0) {
                    core.info(`Rule "${rule.name}" was satisfied`);
                    return false;
                }
                core.info(`Rule "${rule.name}" was not satisfied`);
                return true;
            })
            .map((rule: RuleProcessed): RuleProcessed => {
                rule.reviewers = rule.reviewers.filter((reviewer) => {
                    if (!approvedBy.has(reviewer)) {
                        core.info(
                            `"@${reviewer}" was requested by rule "${rule.name}"`,
                        );
                        return true;
                    }
                    core.info(
                        `"@${reviewer}" has already matched rule "${rule.name}"`,
                    );
                    return false;
                });
                return rule;
            });

        // Update label sets
        labels_to_add = new Set(
            Array.from(labels_to_add).filter(
                (label) => !labels_to_not_add.has(label),
            ),
        );
        labels_to_remove = new Set(
            Array.from(labels_to_remove).filter(
                (label) => !labels_to_add.has(label),
            ),
        );
        labels_to_remove = new Set([...labels_to_remove, ...labels_to_not_add]);

        // Generate success data
        const wholePassed = result.length == 0;

        // Generate comment
        let comment = "";
        if (!wholePassed) {
            const filesToRules: {
                [key: string]: { min: number; requesting: string[] }[];
            } = {};
            for (const rule of result) {
                core.error(
                    `Rule ${rule.name} requires ${
                        rule.min
                    } more reviewers: ${rule.reviewers
                        .map((requesting) => `@${requesting}`)
                        .join(", ")}`,
                    rule.annotation,
                );
                if (rule.annotation.file) {
                    const file = rule.annotation.file;
                    filesToRules[file] = filesToRules[file] || [];
                    filesToRules[file].push({
                        min: rule.min,
                        requesting: rule.reviewers,
                    });
                } else {
                    core.setFailed("Rule annotation must contain a file");
                }
            }

            for (const file in filesToRules) {
                comment = `${comment}\n\n### File \`${file}\`\n\n`;
                const pastReviewers: string[] = [];
                for (const rule of filesToRules[file]) {
                    for (const rule2 of filesToRules[file]) {
                        if (
                            !pastReviewers.includes(
                                rule.requesting.sort().join(","),
                            ) &&
                            rule.requesting.sort().join(",") ===
                                rule2.requesting.sort().join(",")
                        ) {
                            pastReviewers.push(
                                rule.requesting.sort().join(","),
                            );
                            if (rule2.min > rule.min) {
                                comment = `${comment}Requires ${
                                    rule2.min
                                } more reviewers from ${rule.requesting
                                    .map((requesting) => `@${requesting}`)
                                    .join(", ")}\n`;
                            } else {
                                comment = `${comment}Requires ${
                                    rule.min
                                } more reviewers from ${rule.requesting
                                    .map((requesting) => `@${requesting}`)
                                    .join(", ")}\n`;
                            }
                            break;
                        }
                    }
                }
            }
        } else {
            comment = "✅ All reviewers have approved.";
        }

        // Update comment
        previous_comment = (
            await octokit.rest.issues.updateComment({
                owner: repository.owner.login,
                repo: repository.name,
                comment_id: previous_comment.id,
                body: comment,
            })
        ).data;

        // Special case: w-response label
        if (!wholePassed && labels_to_add.size == 0) {
            labels_to_add.add("w-response");
        } else {
            labels_to_remove.add("w-response");
        }

        // Update labels
        const labels = (
            await octokit.rest.issues.listLabelsOnIssue({
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: pull_number,
            })
        ).data.map((label) => label.name);
        labels_to_add = new Set(
            Array.from(labels_to_add).filter(
                (label) => !labels.includes(label),
            ),
        );
        labels_to_remove = new Set(
            Array.from(labels_to_remove).filter((label) =>
                labels.includes(label),
            ),
        );
        core.info(`Adding labels: ${Array.from(labels_to_add).join(", ")}`);
        if (labels_to_add.size > 0) {
            await octokit.rest.issues.addLabels({
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: pull_number,
                labels: [...labels_to_add],
            });
        }
        core.info(
            `Removing labels: ${Array.from(labels_to_remove).join(", ")}`,
        );
        for (const label of labels_to_remove) {
            core.info(`Removing label "${label}"`);
            await octokit.rest.issues.removeLabel({
                owner: repository.owner.login,
                repo: repository.name,
                issue_number: pull_number,
                name: label,
            });
        }

        if (!wholePassed) {
            await preMergeChanges(
                octokit,
                config,
                repository,
                pull_request,
                files,
                false,
            ); // Even if we don't merge, we still want to update PRs where possible
            core.setFailed("Not all reviewers have approved the pull request");
            process.exit(100);
        } else {
            core.info("Auto merging...");
            try {
                await performMergeAction(
                    octokit,
                    config,
                    repository,
                    pull_request,
                    files,
                );
            } catch (e: unknown) {
                previous_comment = (
                    await octokit.rest.issues.updateComment({
                        owner: repository.owner.login,
                        repo: repository.name,
                        comment_id: previous_comment.id,
                        body: `🛑 Auto merge failed. Please see logs for more details, and report this issue at the [\`eip-review-bot\` repository](https://github.com/ethereum/eip-review-bot).`,
                    })
                ).data;
                if (typeof e === "string" || e instanceof Error) {
                    core.setFailed(e);
                } else {
                    core.setFailed(`error ${String(e)}`);
                }
                process.exit(2);
            }
        }
    } catch (e: unknown) {
        previous_comment = (
            await octokit.rest.issues.updateComment({
                owner: repository.owner.login,
                repo: repository.name,
                comment_id: previous_comment.id,
                body: `🛑 \`eip-review-bot\` failed for an unknown reason. Please see logs for more details, and report this issue at the [\`eip-review-bot\` repository](https://github.com/ethereum/eip-review-bot).`,
            })
        ).data;
        throw e;
    }
}

run().catch(() => process.exit(2));
