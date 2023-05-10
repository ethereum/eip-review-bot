import { Config, File, Octokit, FrontMatter } from './types';
import type { Repository } from '@octokit/webhooks-types';
import fm from 'front-matter';
import yaml from 'js-yaml';
import { PullRequest } from '@octokit/webhooks-types';
import crypto from 'crypto';

function getGitBlobSha(content: string) {
    return crypto.createHash('sha1').update(`blob ${content.length}\0${content}`).digest('hex');
}

async function generateEIPNumber(octokit: Octokit, repository: Repository, frontmatter: FrontMatter, file: File, isMerging: boolean = false): Promise<string> {
    // Generate mnemonic name for draft EIPs or EIPs not yet about to be merged
    //if (frontmatter.status == 'Draft' || (frontmatter.status == 'Review' && !isMerging)) { // What I want to do
    if (!isMerging && frontmatter.status == 'Draft' && file.status == 'added') { // What I have to do
        let eip = frontmatter.title.split(/[^\w\d]+/)?.join('_').toLowerCase() as string;
        // If there are trailing underscores, remove them
        while (eip.endsWith('_')) {
            eip = eip.slice(0, -1);
        }
        // If there are leading underscores, remove them
        while (eip.startsWith('_')) {
            eip = eip.slice(1);
        }
        // If the name is too long, truncate it
        if (eip.length > 30) {
            eip = eip.slice(0, 30);
        }
        return `draft_${eip}`;
    }

    // If filename already has an EIP number, use that
    if (file.filename.startsWith('EIPS/eip-')) {
        let eip = file.filename.split('-')[1].split('.')[0];
        if (eip.match(/^\d+$/)) {
            return eip;
        }
    }

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
    return (eipNumber + Math.floor(Math.random() * 3) + 1).toString();
}

async function updateFiles(octokit: Octokit, pull_request: PullRequest, oldFiles: File[], newFiles: File[]) {
    let owner = pull_request.head.repo?.owner?.login as string;
    let repo = pull_request.head.repo?.name as string;
    let parentOwner = pull_request.base.repo?.owner?.login as string;
    let parentRepo = pull_request.base.repo?.name as string;
    let ref = `heads/${pull_request.head.ref as string}`;

    // Update all changed files
    for (let file of newFiles) {
        let changed = !!oldFiles.find(f => f.filename == file.filename && f.contents != file.contents);
        if (changed) {
            let content = file.contents as string;
            let oldContent = oldFiles.find(f => f.filename == file.filename)?.contents as string;
            await octokit.rest.repos.createOrUpdateFileContents({
                owner: owner,
                repo: repo,
                path: file.filename,
                message: `Update ${file.filename}`,
                content,
                sha: getGitBlobSha(oldContent),
                branch: ref
            });
        }
    }
    // Add all new files
    for (let file of newFiles) {
        let added = !oldFiles.find(f => f.filename == file.filename);
        if (added) {
            let content = file.contents as string;
            await octokit.rest.repos.createOrUpdateFileContents({
                owner: owner,
                repo: repo,
                path: file.filename,
                message: `Add ${file.filename}`,
                content,
                branch: ref
            });
        }
    }
    // Delete all deleted files
    for (let file of oldFiles) {
        let removed = !newFiles.find(f => f.filename == file.filename);
        if (removed) {
            // Generate old file sha using blob API
            let oldContent = file.contents as string;
            await octokit.rest.repos.deleteFile({
                owner: owner,
                repo: repo,
                path: file.filename,
                message: `Delete ${file.filename}`,
                sha: getGitBlobSha(oldContent),
                branch: ref
            });
        }
    }

    // For good measure, update the PR body (this also helps the bot to fail if there are any merge conflicts that somehow arose from the above)
    await octokit.rest.pulls.updateBranch({
        owner: parentOwner,
        repo: parentRepo,
        pull_number: pull_request.number
    });
}

export async function preMergeChanges(octokit: Octokit, _: Config, repository: Repository, pull_number: number, files: File[], isMerging: boolean = false) {
    // Fetch PR data
    let pull_request = (await octokit.rest.pulls.get({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_number
    })).data;

    // Modify EIP data when needed
    let anyFilesChanged = false;
    let newFiles = [];
    let oldEipToNewEip: { [key: string]: string } = {};
    for (let file of files) {
        file = { ...file };
        if (file.filename.endsWith('.md')) {
            // Parse file
            const fileContent = file.contents as string;
            const fileData = fm(fileContent);
            const frontmatter = fileData.attributes as FrontMatter;

            // Check if EIP number needs setting
            let eip = await generateEIPNumber(octokit, repository, frontmatter, file, isMerging);

            let oldEip = frontmatter.eip;
            frontmatter.eip = `${eip}`;
            let oldFilename = file.filename;
            file.filename = `EIPS/eip-${eip}.md`;
            
            if (oldFilename != file.filename || oldEip != eip) {
                anyFilesChanged = true;
                oldEipToNewEip[oldFilename.split("-")?.[1]] = file.filename;

                // Retroactively update asset files
                for (let i = 0; i < newFiles.length; i++) {
                    if (newFiles[i].filename.startsWith(`assets/eip-${oldFilename.split("-")?.[1]}`)) {
                        newFiles[i].filename = newFiles[i].filename.replace(`eip-${oldFilename.split("-")?.[1]}`, `eip-${eip}`);
                    }
                }
            }

            // Check if status needs setting
            if (!frontmatter.status) {
                frontmatter.status = "Draft";
                
                anyFilesChanged = true;
            }

            // Check if last call deadline needs setting
            if (frontmatter.status == "Last Call" && !frontmatter["last-call-deadline"]) {
                let fourteenDays = new Date(Date.now() + 12096e5);
                frontmatter["last-call-deadline"] = new Date(`${fourteenDays.getUTCFullYear()}-${fourteenDays.getUTCMonth()}-${fourteenDays.getUTCDate()}`);
                
                anyFilesChanged = true;
            }

            // Now, regenerate markdown from front matter
            let newYaml = yaml.dump(frontmatter, {
                // Ensure preamble is in the right order
                sortKeys: function (a, b) {
                    let preambleOrder = [
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
                        "withdrawal-reason"
                    ];
                    return preambleOrder.indexOf(a) - preambleOrder.indexOf(b);
                },
                // Ensure that dates and integers are not turned into strings
                replacer: function (key, value) {
                    if (key == 'eip' && Number.isInteger(value)) {
                        return parseInt(value); // Ensure that it's an integer
                    }
                    if (key == 'requires' && typeof value == 'string' && !value.includes(",")) {
                        return parseInt(value); // Ensure that non-list requires aren't transformed into strings
                    }
                    if (key == 'created' || key == 'last-call-deadline') {
                        return new Date(value); // Ensure that it's a date object
                    }
                    return value;
                },
                // Generic options
                lineWidth: -1, // No max line width for preamble
                noRefs: true, // Disable YAML references
            });
            newYaml = newYaml.trim(); // Get rid of excess whitespace
            newYaml = newYaml.replaceAll('T00:00:00.000Z', ''); // Mandated date formatting by EIP-1
            
            // Regenerate file contents
            file.contents = `---\n${newYaml}\n---\n\n${fileData.body}`;
            
            // Push
            newFiles.push(file);
        } else if (file.filename.startsWith('assets/eip-')) {
            let oldFilename = file.filename;
            let eip = oldFilename.split("-")?.[1];
            if (eip in oldEipToNewEip) {
                // Rename file
                file.filename = file.filename.replace(`eip-${eip}`, `eip-${oldEipToNewEip[eip].split("-")?.[1]}`);

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
    if (anyFilesChanged) {
        await updateFiles(octokit, pull_request as PullRequest, files, newFiles);
    }
}

export async function performMergeAction(octokit: Octokit, _: Config, repository: Repository, pull_number: number, files: File[]) {
    // Fetch PR data
    let pull_request = (await octokit.rest.pulls.get({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_number
    })).data;
    const title = pull_request.title;
    
    // Make pre-merge changes
    await preMergeChanges(octokit, _, repository, pull_number, files, true);

    // Enable auto merge
    // Need to use GraphQL API to enable auto merge
    // https://docs.github.com/en/graphql/reference/mutations#enablepullrequestautomerge
    const response = await octokit.graphql(
        // There's a bug with Prettier that breaks the syntax highlighting for the rest of the file if I don't do indentation like this
        `query GetPullRequestId($owner: String!, $repo: String!, $pullRequestNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                pullRequest(number: $pullRequestNumber) {
                    id
                }
            }
        }`, {
            owner: repository.owner.login,
            repo: repository.name,
            pullRequestNumber: pull_number
        }
    ) as any;
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
        }`, {
            pullRequestId: response.repository.pullRequest.id,
            commitHeadline: title,
            commitBody: `Merged by EIP-Bot.`,
            mergeMethod: "SQUASH"
        }
    );

    // Approve PR
    await octokit.rest.pulls.createReview({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_number,
        event: "APPROVE",
        body: "All Reviewers Have Approved; Performing Automatic Merge..."
    });
}
