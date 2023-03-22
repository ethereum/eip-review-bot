import { Config, File, Octokit, FrontMatter } from './types';
import type { Repository } from '@octokit/webhooks-types';
import localConfig from './localConfig';
import fm from 'front-matter';
import yaml from 'js-yaml';
import { PullRequest } from '@octokit/webhooks-types';

async function generateEIPNumber(octokit: Octokit, repository: Repository) {
    // Get all EIPs
    const eips = (await octokit.rest.repos.getContent({
        owner: repository.owner.login,
        repo: repository.name,
        path: 'EIPS'
    })).data as any[];

    // Get all EIP numbers
    const eipNumbers = eips
        .filter(eip => eip.name.startsWith('eip-'))
        .map(eip => {
            try {
                return Number(eip.name.split('-')[1]);
            } catch {
                return 0;
            }
        });

    // Find the biggest EIP number
    const eipNumber = Math.max(...eipNumbers);

    // Add a random number from 1-5 to the EIP number
    // This is to prevent conflicts when multiple PRs are merged at the same time, and to prevent number gaming
    return eipNumber + Math.floor(Math.random() * 3) + 1;
}

async function updateFiles(octokit: Octokit, pull_request: PullRequest, oldFiles: File[], newFiles: File[]) {
    let owner = pull_request.head.repo?.owner?.login as string;
    let repo = pull_request.head.repo?.name as string;
    let ref = `heads/${pull_request.head.ref as string}`;
    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref,
    });
    const commitSha = refData.object.sha;
    const { data: commitData } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: commitSha,
    });
    const currentCommit = {
        commitSha,
        treeSha: commitData.tree.sha,
    };
    let blobs = [];
    for (let i = 0; i < newFiles.length; i++) {
        const content = newFiles[i].contents as string;
        const blobData = await octokit.rest.git.createBlob({
            owner: pull_request.head.repo?.owner?.login as string,
            repo: pull_request.head.repo?.name as string,
            content,
            encoding: 'utf-8',
        });
        blobs.push(blobData.data);
    }
    const paths = newFiles.map(file => file.filename);
    const tree = blobs.map(({ sha }, index) => ({
        path: paths[index],
        mode: `100644`,
        type: `blob`,
        sha,
    })) as any[];
    const { data: oldTree } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: currentCommit.treeSha,
        recursive: "true", // Why does this have to be a *string*?
    });
    const oldPaths = oldFiles.map(file => file.filename);
    for (let oldTreeFile of oldTree.tree) {
        if (oldTreeFile.type != "tree" && !oldPaths.includes(oldTreeFile.path as string)) {
            tree.push(oldTreeFile);
        }
    }
    const { data: newTree } = await octokit.rest.git.createTree({
        owner,
        repo,
        tree,
    });
    const message = `Commit from EIP-Bot`;
    const newCommit = (await octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [currentCommit.commitSha],
    })).data;
    await octokit.rest.git.updateRef({
        owner,
        repo,
        ref,
        sha: newCommit.sha,
    });
}

export async function performMergeAction(octokit: Octokit, _: Config, repository: Repository, pull_number: number, files: File[]) {
    // Fetch PR data
    let pull_request = (await octokit.rest.pulls.get({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_number
    })).data;
    const title = pull_request.title;

    // Modify EIP data when needed
    let newFiles = [];
    for (let file of files) {
        file = { ...file };
        if (file.filename.endsWith('.md')) {
            // Parse file
            const fileContent = file.contents as string;
            const fileData = fm(fileContent);
            const frontmatter = fileData.attributes as FrontMatter;

            // Check if EIP number needs setting
            if (!frontmatter.eip && frontmatter.status != "Draft") {
                let eip = await generateEIPNumber(octokit, repository);

                frontmatter.eip = `${eip}`;
                file.filename = `EIPS/eip-${eip}.md`;
            }

            // Check if status needs setting
            if (!frontmatter.status) {
                frontmatter.status = "Draft";
            }

            // Check if last call deadline needs setting
            if (frontmatter.status == "Last Call" && !frontmatter["last-call-deadline"]) {
                let fourteenDays = new Date(Date.now() + 12096e5);
                frontmatter["last-call-deadline"] = `${fourteenDays.getUTCFullYear()}-${fourteenDays.getUTCMonth()}-${fourteenDays.getUTCDate()}`;
            }

            // Now, regenerate markdown from front matter
            file.contents = `---\n${yaml.dump(frontmatter).trim()}\n---\n\n${fileData.body}`;
            
            // Push
            newFiles.push(file);
        }
    }

    // Push changes
    await updateFiles(octokit, pull_request as PullRequest, files, newFiles);

    // Enable auto merge
    // Need to use GraphQL API to enable auto merge
    // https://docs.github.com/en/graphql/reference/mutations#enablepullrequestautomerge
    const response = await octokit.graphql(`
        query GetPullRequestId($owner: String!, $repo: String!, $pullRequestNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                pullRequest(number: $pullRequestNumber) {
                    id
                }
            }
        }
    `, {
        owner: repository.owner.login,
        repo: repository.name,
        pullRequestNumber: pull_number
    }) as any;
    await octokit.graphql(`
        mutation EnableAutoMerge($pullRequestId: ID!, $commitHeadline: String!, $authorEmail: String!) {
            enablePullRequestAutoMerge(input: {
                pullRequestId: $pullRequestId,
                commitHeadline: $commitHeadline,
                authorEmail: $authorEmail,
                clientMutationId: "enable-auto-merge"
            }) {
                clientMutationId
            }
        }
    `, {
        pullRequestId: response.repository.pullRequest.id,
        commitHeadline: title,
        authorEmail: localConfig.commitEmail
    });

    // Approve PR
    await octokit.rest.pulls.createReview({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_number,
        event: "APPROVE",
        body: "All reviewers have approved; Merging..."
    });
}
