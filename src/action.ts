import core from '@actions/core';
import github from '@actions/github';
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { throttling } from "@octokit/plugin-throttling";
import { parse } from 'yaml';
import { PullRequestEvent } from "@octokit/webhooks-types";
import processFiles from './process.js';
import { Rule } from './types.js';

const unknown = "<unknown>";
const ThrottledOctokit = GitHub.plugin(throttling);
// Initialize GitHub API
const GITHUB_TOKEN = core.getInput('token');
const octokit = new ThrottledOctokit(getOctokitOptions(GITHUB_TOKEN, { throttle: {
    onRateLimit: (retryAfter: number, options: any) => {
        octokit.log.warn(`Request quota exhausted for request ${options?.method || unknown} ${options?.url || unknown}`);
        if (options?.request?.retryCount <= 2) {
            console.log(`Retrying after ${retryAfter} seconds!`);
            return true;
        }
    },
    onSecondaryRateLimit: (_retryAfter: number, options: any) => octokit.log.warn(`Abuse detected for request ${options?.method || unknown} ${options?.url || unknown}`),
} }));

async function run() {
    // Deconstruct the payload
    const payload = github.context.payload as Partial<PullRequestEvent>;
    const { repository, pull_request } = payload;
    let pull_number = pull_request?.number;
    if (!pull_number) {
        pull_number = parseInt(core.getInput('pr_number'));
    }

    // Parse config file
    const response = await octokit.request(`GET /repos/${repository.owner.login}/${repository.name}/contents/${core.getInput('config') || 'eip-editors.yml'}`);
    if (response.status !== 200) {
        core.setFailed('Could not find eip-editors.yml');
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
    let requiredReviewers = new Set<string>();
    let reviewedBy = new Set<string>();

    const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
        owner: repository.owner.login,
        repo: repository.name,
        pull_number
    });

    const requestedReviews = (await octokit.paginate(octokit.rest.pulls.listRequestedReviewers, {
        owner: repository.owner.login,
        repo: repository.name,
        pull_number
    })).map((reviewer: any) => {
        return reviewer.login as string;
    });

    for (let review of reviews) {
        if (review.state == 'APPROVED' && review.user?.login) {
            result = result.map((rule: Rule): Rule => {
                if (rule.reviewers.includes(review.user?.login as string)) {
                    rule.min = rule.min - 1;
                }
                return rule;
            }).filter(rule => {
                return rule.min > 0;
            });
            reviewedBy.add(review.user?.login as string);
        }
    }

    let wholePassed = true;
    let comment = '';
    let filesToRules = {};
    for (let rule of result) {
        let passed = true;
        let requesting = [];
        for (let reviewer of rule.reviewers) {
            if (!reviewedBy.has(reviewer) && !requestedReviews.includes(reviewer)) {
                requiredReviewers.add(reviewer);
            }
            if (!reviewedBy.has(reviewer)) {
                wholePassed = false;
                passed = false;
                requesting.push(reviewer);
            }
        }
        if (!passed) {
            core.error(`Rule ${rule.name} requires ${rule.min} more reviewers: ${requesting.map(requesting => `@${requesting}`).join(", ")}`, rule.annotation);
            filesToRules[rule.annotation.file] = filesToRules[rule.annotation.file] || [];
            filesToRules[rule.annotation.file].push({ min: rule.min, requesting });
        }
    }
    
    for (let file in filesToRules) {
        comment = `${comment}\n\n### File \`${file}\`\n\n`;
        let pastReviewers = [];
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
    
    if (comment == '') {
        comment = 'All reviewers have approved. Auto merging...';
    }
    
    let me = await octokit.rest.users.getAuthenticated();
    let comments = await octokit.rest.issues.listComments({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pull_number
    });
    
    let previous_comment = comments.data.find(comment => comment.user.login == me.data.login);
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
