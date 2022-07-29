import core from '@actions/core';
import github from '@actions/github';
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils.js";
import { throttling } from "@octokit/plugin-throttling";
import { parse } from 'yaml';
import { PullRequestEvent } from "@octokit/webhooks-types";
import processFiles from './process';
import { Rule } from './types';

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
    const payload = github.context.payload as PullRequestEvent;
    const { repository, pull_request } = payload;

    // Parse config file
    const response = await octokit.request(`GET /repos/${repository.owner.login}/${repository.name}/contents/eip-editors.yml`);
    if (response.status !== 200) {
        core.setFailed('Could not find eip-editors.yml');
        process.exit(1);
    }
    const config = parse(Buffer.from(response.data.content, "base64").toString("utf8")) as { [key: string]: string[]; };

    // Process files
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: pull_request.base.repo.owner.login,
        repo: pull_request.base.repo.name,
        pull_number: pull_request.number,
    });

    let result: Rule[] = await processFiles(octokit, config, files);

    // Set the output
    let requiredReviewers = new Set<string>();
    let reviewedBy = new Set<string>();

    const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
        owner: pull_request.base.repo.owner.login,
        repo: pull_request.base.repo.name,
        pull_number: pull_request.number,
    });

    const requestedReviews = (await octokit.paginate(octokit.rest.pulls.listRequestedReviewers, {
        owner: pull_request.base.repo.owner.login,
        repo: pull_request.base.repo.name,
        pull_number: pull_request.number,
    })).map((reviewer: any) => reviewer.login);

    for (let review of reviews) {
        if (review.state == 'APPROVED' && review.commit_id == pull_request.head.sha && review.user?.login) {
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

    for (let rule of result) {
        for (let reviewer of rule.reviewers) {
            if (!reviewedBy.has(reviewer) && !requestedReviews.includes(reviewer)) {
                requiredReviewers.add(reviewer);
            }
        }
    }

    if (requiredReviewers.size) {
        octokit.rest.pulls.requestReviewers({
            owner: repository.owner.login,
            repo: repository.name,
            pull_number: pull_request.number,
            reviewers: [...requiredReviewers],
        });
    }

    let reviewersToDismiss = requestedReviews.filter(reviewer => !requiredReviewers.has(reviewer)).filter(reviewer => !reviewedBy.has(reviewer));
    if (reviewersToDismiss.length) {
        octokit.rest.pulls.removeRequestedReviewers({
            owner: pull_request.base.repo.owner.login,
            repo: pull_request.base.repo.name,
            pull_number: pull_request.number,
            reviewers: reviewersToDismiss,
        });
    }
};

run();
