import github from '@actions/github';
import core from '@actions/core';
import { PullRequestEvent } from '@octokit/webhooks-types';
import { Octokit, Config, File, Rule } from "./types.js";

import checkAssets from './rules/assets.js';
import checkAuthors from './rules/authors.js';
import checkNew from './rules/new.js';
import checkStatus from './rules/statuschange.js';
import checkTerminalStatus from './rules/terminal.js';
import checkOtherFiles from './rules/unknown.js';

let rules = [ checkAssets, checkAuthors, checkNew, checkStatus, checkTerminalStatus, checkOtherFiles ];

export default async function(octokit: Octokit, config: Config, files: File[]) {
    let files2: File[] = await Promise.all(files.map(async file => {
        // Deconstruct
        const payload = github.context.payload as Partial<PullRequestEvent>;
        let { repository, pull_request } = payload;
        let pull_number = pull_request?.number;
        if (!pull_number) {
            pull_number = parseInt(core.getInput('pr_number'));
            const pr = await octokit.rest.pulls.get({
              owner: repository.owner.login,
              repo: repository.name,
              pull_number,
            });
            pull_request = pr.data;
        }
        
        // Get file contents
        if (["removed", "modified", "renamed"].includes(file.status)) {
            const response = await octokit.rest.repos.getContent({
                owner: pull_request.base.repo.owner.login,
                repo: pull_request.base.repo.name,
                path: file.previous_filename || file.filename,
                ref: pull_request.base.ref
            });
            file.previous_contents = Buffer.from(response.data.content, "base64").toString("utf8");
            if (!file.previous_contents) {
                core.warning(`Could not get previous contents of ${file.filename}`, { file: file.filename });
            }
        }

        if (["modified", "renamed", "added", "copied"].includes(file.status)) {
            const response = await octokit.rest.repos.getContent({
                owner: pull_request.head.repo.owner.login,
                repo: pull_request.head.repo.name,
                path: file.filename,
                ref: pull_request.head.ref
            });
            file.contents = Buffer.from(response.data.content, "base64").toString("utf8");
            if (!file.contents) {
                core.warning(`Could not get new contents of ${file.filename}`, { file: file.filename });
            }
        }

        return file;
    }));

    // Get results
    let res : Rule[][] = await Promise.all(rules.map(rule => rule(octokit, config, files2)));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
