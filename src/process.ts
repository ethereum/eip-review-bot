import github from '@actions/github';
import core from '@actions/core';
import { PullRequestEvent, PullRequest, Repository } from '@octokit/webhooks-types';
import { Octokit, Config, File, Rule } from "./types.js";

import checkAssets from './rules/assets.js';
import checkAuthors from './rules/authors.js';
import checkNew from './rules/new.js';
import checkStatus from './rules/statuschange.js';
import checkStagnant from './rules/stagnant.js';
import checkTerminalStatus from './rules/terminal.js';
import checkEditorFile from './rules/editorFile.js';
import checkOtherFiles from './rules/unknown.js';

import { generatePRTitle } from './namePr.js';

let rules = [ checkAssets, checkAuthors, checkNew, checkStatus, checkStagnant, checkTerminalStatus, checkEditorFile, checkOtherFiles ];

export default async function(octokit: Octokit, config: Config, files: File[], rename=true) {
    // Deconstruct
    const payload = github.context.payload as Partial<PullRequestEvent>;
    let repository = payload.repository as Repository;
    let pull_request = payload.pull_request as PullRequest;
    let pull_number = pull_request?.number;
    if (!pull_number) {
        pull_number = parseInt(core.getInput('pr_number'));
        const pr = await octokit.rest.pulls.get({
          owner: repository.owner.login,
          repo: repository.name,
          pull_number,
        });
        pull_request = pr.data as PullRequest;
    }
    // Get file modification statuses
    // Due to a GitHub bug, sometimes files are listed twice with different modification types
    let statusesByFile = {};
    for (let file of files) {
        if (!(file.filename in statusesByFile)) {
            statusesByFile[file.filename] = new Set();
        }
        statusesByFile[file.filename].add(file.status);
    }
    let files2: File[] = await Promise.all(files.map(async file => {
        // Get file contents
        let statuses = statusesByFile[file.filename];
        core.info(`Detected file ${file.filename} (statuses = ${statusesByFile[file.filename]})`);
        
        if (["removed", "modified", "renamed"].some(x => statuses.has(x)) && !file?.previous_contents) {
            core.info(`Detected file ${file.filename} already existing in repository (status = ${file.status})`);
            try {
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
            } catch (e) {
                if (["removed", "modified", "renamed"].some(x => !statuses.has(x))) {
                    core.warning(`An error occured when fetching previous contents of ${file.filename}`);
                } else {
                    core.setFailed(`An error occured when fetching previous contents of ${file.filename}`);
                    throw e;
                }
            }
        }

        if (["modified", "renamed", "added", "copied"].some(x => statuses.has(x)) && !file?.contents) {
            core.info(`Detected file ${file.filename} modified in PR (status = ${file.status})`);
            try {
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
            } catch (e) {
                if (["modified", "renamed", "added", "copied"].some(x => !statuses.has(x))) {
                    core.warning(`An error occured when fetching real contents of ${file.filename}`);
                } else {
                    core.setFailed(`An error occured when fetching real contents of ${file.filename}`);
                    throw e;
                }
            }
        }

        return file;
    }));
    
    // Rename PR
    if (rename){
        let newPRTitle = await generatePRTitle(octokit, config, repository, pull_number, files);
        if (newPRTitle && newPRTitle != pull_request?.title) {
            await octokit.rest.pulls.update({
                owner: repository.owner.login,
                repo: repository.name,
                pull_number,
                title: newPRTitle
            });
        }
    }

    // Get results
    let res : Rule[][] = await Promise.all(rules.map(rule => rule(octokit, config, files2)));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
