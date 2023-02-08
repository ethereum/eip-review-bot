import core from '@actions/core';
import github from '@actions/github';
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { throttling } from "@octokit/plugin-throttling";
import { parse } from 'yaml';
import { PullRequestEvent, Repository, PullRequest } from "@octokit/webhooks-types";
import processFiles from './process.js';
import { Rule } from './types.js';

const unknown = "<unknown>";
const ThrottledOctokit = GitHub.plugin(throttling);
// Initialize GitHub API
const GITHUB_TOKEN = core.getInput('token');
const octokit = new ThrottledOctokit(getOctokitOptions(GITHUB_TOKEN, { throttle: {
    onRateLimit: (retryAfter: number, options: any) => {
        core.warn(`Request quota exhausted for request ${options?.method || unknown} ${options?.url || unknown}`);
        if (options?.request?.retryCount <= 2) {
            core.notice(`Retrying after ${retryAfter} seconds!`);
            return true;
        }
    },
    onSecondaryRateLimit: (_retryAfter: number, options: any) => core.error(`Abuse detected for request ${options?.method || unknown} ${options?.url || unknown}`),
} }));

async function run() {
    // Deconstruct the payload
    const payload = github.context.payload as Partial<PullRequestEvent>;  // Partial since it might be ran from a non pull_request event
    const repository = payload.repository as Repository;  // Guaranteed to be present no matter the event
    let pull_request = payload.pull_request as PullRequest;
    let pull_number = pull_request?.number;
    if (!pull_number) {  // If ran from a non pull_request event, fetch necessary data
        core.info("Detected non pull_request_target configuration. Fetching data.");
        pull_number = parseInt(core.getInput('pr_number'));
        let pull_request_response = await octokit.rest.pulls.get({
            owner: repository.owner.login,
            repo: repository.name,
            pull_number
        });
        if (pull_request_response.status !== 200) {
            core.setFailed(`Could not fetch data for Pull Request ${repository.owner.login}/${repository.name}#${pull_number}`);
            process.exit(4);
        }
        pull_request = pull_request_response.data;
    } else {
        core.info("Detected pull_request_target configuration. Using GitHub-provided data.");
    }
    core.info(`Running eip-review-bot on ${repository.owner.login}/${repository.name}#${pull_number} by "@${pull_request?.user?.login}"`);

    // Pull and parse config file from EIPs repository (NOT PR HEAD)
    const response = await octokit.rest.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path: core.getInput('config') || 'eip-editors.yml'
    });
    if (response.status !== 200) {
        core.setFailed(`Could not find file "${core.getInput('config') || 'eip-editors.yml'}"`);
        process.exit(3);
    }
    const config = parse(Buffer.from(response.data.content, "base64").toString("utf8")) as { [key: string]: string[]; };

    // Process files
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: repository.owner.login,
        repo: repository.name,
        pull_number
    });

    let result: Rule[] = await processFiles(octokit, config, files);

    // Set the output
    let reviewedBy = new Set<string>();

    // Add PR author as reviewer when applicable
    result = result.map((rule: Rule): Rule => {
        if (rule.pr_approval && rule.reviewers.includes(pull_request?.user?.login as string)) {
            core.info(`PR Author "@${pull_request?.user?.login}" matched rule "${rule.name}" (PR Author Approval Enabled)`);
            rule.min = rule.min - 1;
        } else {
            core.info(`PR Author "@${pull_request?.user?.login}" did not match rule "${rule.name}" (PR Author Approval Disabled)`);
        }
        return rule;
    });
    reviewedBy.add(pull_request?.user?.login as string);

    // Add proper reviewers as reviewers
    const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
        owner: repository.owner.login,
        repo: repository.name,
        pull_number
    });
    for (let review of reviews) {
        if (review.state == 'APPROVED' && review.user?.login) {
            reviewedBy.add(review.user?.login as string);
            result = result.map((rule: Rule): Rule => {
                if (rule.reviewers.includes(review.user?.login as string)) {
                    core.info(`Review by "@${pull_request?.user?.login}" matched rule "${rule.name}"`);
                    rule.min = rule.min - 1;
                } else {
                    core.info(`Review by "@${pull_request?.user?.login}" did not match rule "${rule.name}"`)
                }
                return rule;
            });
        }
    }
    
    // Remove all rules that were satisfied, and all active reviewers
    result = result.filter(rule => {
        if (rule.min <= 0) {
            core.info(`Rule "${rule.name}" was satisfied`);
            return false;
        }
        core.info(`Rule "${rule.name}" was not satisfied`)
        return true;
    }).map((rule: Rule): Rule => {
        rule.reviewers = rule.reviewers.filter(reviewer => {
            if (!reviewedBy.has(reviewer)) {
                core.info(`"@${reviewer}" was requested by rule "${rule.name}"`);
                return true;
            }
            core.info(`"@${reviewer}" has already matched rule "${rule.name}"`);
            return false;
        });
        return rule;
    });
    
    // Generate success data
    let wholePassed = result.length == 0;

    // Generate comment
    let comment = '';
    if (!wholePassed) {
        let filesToRules = {} as { [key: string]: { min: number, requesting: string[] }[] };
        for (let rule of result) {
            core.error(`Rule ${rule.name} requires ${rule.min} more reviewers: ${rule.reviewers.map(requesting => `@${requesting}`).join(", ")}`, rule.annotation);
            if (rule.annotation.file) {
                let file = rule.annotation.file as string;
                filesToRules[file] = filesToRules[file] || [];
                filesToRules[file].push({ min: rule.min, requesting: rule.reviewers });
            } else {
                core.setFailed('Rule annotation must contain a file');
            }
        }

        for (let file in filesToRules) {
            comment = `${comment}\n\n### File \`${file}\`\n\n`;
            let pastReviewers = [] as string[];
            for (let rule of filesToRules[file]) {
                for (let rule2 of filesToRules[file]) {
                    if (!pastReviewers.includes(rule.requesting.sort().join(',')) && rule.requesting.sort().join(',') === rule2.requesting.sort().join(',')) {
                        pastReviewers.push(rule.requesting.sort().join(','));
                        if (rule2.min > rule.min) {
                            comment = `${comment}Requires ${rule2.min} more reviewers from ${rule.requesting.map(requesting => `@${requesting}`).join(", ")}\n`;
                        } else {
                            comment = `${comment}Requires ${rule.min} more reviewers from ${rule.requesting.map(requesting => `@${requesting}`).join(", ")}\n`;
                        }
                        break;
                    }
                }
            }
        }
    } else {
        comment = 'All reviewers have approved. Auto merging...';
    }
    
    let me = await octokit.rest.users.getAuthenticated();
    let comments = await octokit.rest.issues.listComments({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pull_number
    });
    
    let previous_comment = comments.data.find(comment => comment?.user?.login == me.data.login);
    if (previous_comment) {
        await octokit.rest.issues.updateComment({
            owner: repository.owner.login,
            repo: repository.name,
            comment_id: previous_comment.id,
            body: comment
        });
    } else {
        await octokit.rest.issues.createComment({
            owner: repository.owner.login,
            repo: repository.name,
            issue_number: pull_number,
            body: comment
        });
    }

    if (!wholePassed) {
        core.setFailed('Not all reviewers have approved the pull request');
        process.exit(2);
    }
};

run();
