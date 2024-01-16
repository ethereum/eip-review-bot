/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/require-await */
import type { Octokit } from "../types";
import { Repository, User } from "@octokit/webhooks-types";

// Documentation:
// PR-1: A PR that modifies EIP-1
// PR-2: A PR that modifies a file in the .github/workflows directory
// PR-3: A PR that modifies a file in the config director
// PR-4: A PR that modifies a file in the .github directory
// PR-5: A PR that modifies the EIP template
// PR-6: A PR that modifies the EIP README
// PR-7: A PR that adds a new EIP
// PR-8: A PR that updates an existing EIP's status
// PR-9: A PR that changes an existing EIP
// PR-10: A PR that changes an existing final EIP
// PR-11: A PR that changes an existing living EIP
// PR-12: A PR that modifies the website

export function generateMockOctokit(): Octokit {
    return {
        rest: {
            repos: {
                getContent: async (params: any): Promise<any> => {
                    const path: string = params.path;
                    if (path === "content/00005.md") {
                        return {
                            data: {
                                type: "file",
                                content: `---
eip: 5
title: Some EIP
description: Some EIP's description
author: Foo (@foo)
discussions-to: https://example.com
status: Draft
type: Standards Track
category: Core
created: 2020-10-05
---

hello world`,
                            },
                        };
                    } else {
                        throw new Error(`Missing mock for ${path}`);
                    }
                },
            },
            pulls: {
                get: async (params: any) => {
                    const owner: string = params.owner;
                    const repo: string = params.repo;
                    const pull_number: number = params.pull_number;
                    if (owner === "ethereum" && repo === "EIPs") {
                        switch (pull_number) {
                            case 1:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (EIP-1)",
                                    },
                                };
                            case 2:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (.github/workflows)",
                                    },
                                };
                            case 3:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (config)",
                                    },
                                };
                            case 4:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (.github)",
                                    },
                                };
                            case 5:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (EIP Template)",
                                    },
                                };
                            case 6:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (EIP README)",
                                    },
                                };
                            case 7:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (New EIP)",
                                    },
                                };
                            case 8:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (Status Change EIP-9999)",
                                    },
                                };
                            case 9:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (Update EIP-9999)",
                                    },
                                };
                            case 10:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (Update EIP-9999 Final)",
                                    },
                                };
                            case 11:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (Update EIP-9999 Living)",
                                    },
                                };
                            case 12:
                                return {
                                    data: {
                                        title: "PR Title Testing 123 (Update Website)",
                                    },
                                };
                        }
                    }
                    return {
                        data: {
                            title: "this-is-a-bug-please-report-it", // Should never happen
                        },
                    };
                },
            },
        },
    } as Octokit;
}

export const mockOctokit: Octokit = generateMockOctokit();

export const mockEthereumOrg: User = {
    id: 1,
    login: "ethereum",
    type: "Organization",
    url: "https://api.github.com/orgs/ethereum",
    avatar_url: "https://avatars.githubusercontent.com/u/6250754?v=4", // Github copilot actually did this, including the user ID. Amazing!
    node_id: "MDEyOk9yZ2FuaXphdGlvbjYyNjUzNzI=",
    gravatar_id: "",
    html_url: "https://github.com/ethereum",
    followers_url: "https://api.github.com/users/ethereum/followers",
    following_url:
        "https://api.github.com/users/ethereum/following{/other_user}",
    gists_url: "https://api.github.com/users/ethereum/gists{/gist_id}",
    starred_url: "https://api.github.com/users/ethereum/starred{/owner}{/repo}",
    subscriptions_url: "https://api.github.com/users/ethereum/subscriptions",
    organizations_url: "https://api.github.com/users/ethereum/orgs",
    repos_url: "https://api.github.com/users/ethereum/repos",
    events_url: "https://api.github.com/users/ethereum/events{/privacy}",
    received_events_url:
        "https://api.github.com/users/ethereum/received_events",
    site_admin: false,
};
export const mockForkUser: User = {
    id: 2,
    login: "fork-user",
    type: "User",
    url: "https://api.github.com/users/fork-user",
    avatar_url: "https://avatars.githubusercontent.com/u/2?v=4",
    node_id: "MDQ6VXNlcjI=",
    gravatar_id: "",
    html_url: "https://github.com/fork-user",
    followers_url: "https://api.github.com/users/fork-user/followers",
    following_url:
        "https://api.github.com/users/fork-user/following{/other_user}",
    gists_url: "https://api.github.com/users/fork-user/gists{/gist_id}",
    starred_url:
        "https://api.github.com/users/fork-user/starred{/owner}{/repo}",
    subscriptions_url: "https://api.github.com/users/fork-user/subscriptions",
    organizations_url: "https://api.github.com/users/fork-user/orgs",
    repos_url: "https://api.github.com/users/fork-user/repos",
    events_url: "https://api.github.com/users/fork-user/events{/privacy}",
    received_events_url:
        "https://api.github.com/users/fork-user/received_events",
    site_admin: false,
};

export const mockEIPsRepo: Repository = {
    id: 1,
    owner: mockEthereumOrg,
    name: "EIPs",
    full_name: "ethereum/EIPs",
    private: false,
    node_id: "MDEwOlJlcG9zaXRvcnk2MjY1Mzcy",
    html_url: "https://github.com/ethereum/EIPs",
    description: "Ethereum Improvement Proposals (EIPs)",
    fork: false,
    url: "https://api.github.com/repos/ethereum/EIPs",
    archive_url:
        "https://api.github.com/repos/ethereum/EIPs/{archive_format}{/ref}",
    assignees_url:
        "https://api.github.com/repos/ethereum/EIPs/assignees{/user}",
    blobs_url: "https://api.github.com/repos/ethereum/EIPs/git/blobs{/sha}",
    branches_url:
        "https://api.github.com/repos/ethereum/EIPs/branches{/branch}",
    collaborators_url:
        "https://api.github.com/repos/ethereum/EIPs/collaborators{/collaborator}",
    comments_url:
        "https://api.github.com/repos/ethereum/EIPs/comments{/number}",
    commits_url: "https://api.github.com/repos/ethereum/EIPs/commits{/sha}",
    compare_url:
        "https://api.github.com/repos/ethereum/EIPs/compare/{base}...{head}",
    contents_url: "https://api.github.com/repos/ethereum/EIPs/contents/{+path}",
    contributors_url: "https://api.github.com/repos/ethereum/EIPs/contributors",
    deployments_url: "https://api.github.com/repos/ethereum/EIPs/deployments",
    downloads_url: "https://api.github.com/repos/ethereum/EIPs/downloads",
    events_url: "https://api.github.com/repos/ethereum/EIPs/events",
    forks_url: "https://api.github.com/repos/ethereum/EIPs/forks",
    git_commits_url:
        "https://api.github.com/repos/ethereum/EIPs/git/commits{/sha}",
    git_refs_url: "https://api.github.com/repos/ethereum/EIPs/git/refs{/sha}",
    git_tags_url: "https://api.github.com/repos/ethereum/EIPs/git/tags{/sha}",
    git_url: "git://github.com/ethereum/EIPs.git",
    issue_comment_url:
        "https://api.github.com/repos/ethereum/EIPs/issues/comments{/number}",
    issue_events_url:
        "https://api.github.com/repos/ethereum/EIPs/issues/events{/number}",
    issues_url: "https://api.github.com/repos/ethereum/EIPs/issues{/number}",
    keys_url: "https://api.github.com/repos/ethereum/EIPs/keys{/key_id}",
    labels_url: "https://api.github.com/repos/ethereum/EIPs/labels{/name}",
    languages_url: "https://api.github.com/repos/ethereum/EIPs/languages",
    merges_url: "https://api.github.com/repos/ethereum/EIPs/merges",
    milestones_url:
        "https://api.github.com/repos/ethereum/EIPs/milestones{/number}",
    notifications_url:
        "https://api.github.com/repos/ethereum/EIPs/notifications{?since,all,participating}",
    pulls_url: "https://api.github.com/repos/ethereum/EIPs/pulls{/number}",
    releases_url: "https://api.github.com/repos/ethereum/EIPs/releases{/id}",
    ssh_url: "", // IDK what this is
    stargazers_url: "https://api.github.com/repos/ethereum/EIPs/stargazers",
    statuses_url: "https://api.github.com/repos/ethereum/EIPs/statuses/{sha}",
    subscribers_url: "https://api.github.com/repos/ethereum/EIPs/subscribers",
    subscription_url: "https://api.github.com/repos/ethereum/EIPs/subscription",
    tags_url: "https://api.github.com/repos/ethereum/EIPs/tags",
    teams_url: "https://api.github.com/repos/ethereum/EIPs/teams",
    trees_url: "https://api.github.com/repos/ethereum/EIPs/git/trees{/sha}",
    clone_url: "", // IDK what this is either
    mirror_url: null,
    hooks_url: "https://api.github.com/repos/ethereum/EIPs/hooks",
    svn_url: "", // IDK what this is either
    homepage: "https://eips.ethereum.org",
    language: null,
    forks_count: 1,
    created_at: "2012-10-01T20:04:47Z",
    updated_at: "2019-10-29T19:00:00Z",
    pushed_at: "2019-10-29T19:00:00Z",
    size: 0,
    stargazers_count: 0,
    watchers_count: 0,
    default_branch: "master",
    open_issues_count: 0,
    is_template: false,
    topics: [],
    has_issues: true,
    has_projects: true,
    has_wiki: false,
    has_pages: true,
    has_downloads: true,
    archived: false,
    disabled: false,
    visibility: "public",
    license: {
        key: "CC0-1.0",
        name: "Creative Commons Zero v1.0 Universal",
        spdx_id: "CC0-1.0",
        node_id: "MDc6TGljZW5zZTY=",
        url: null,
    },
    forks: 1,
    open_issues: 0,
    watchers: 0,
    web_commit_signoff_required: false,
};
export const mockEIPsForkRepo: Repository = {
    id: 1,
    owner: mockForkUser,
    name: "fork-user",
    full_name: "fork-user/EIPs",
    private: false,
    node_id: "MDEwOlJlcG9zaXRvcnk2MjY1Mzcy",
    html_url: "https://github.com/fork-user/EIPs",
    description: "Ethereum Improvement Proposals (EIPs)",
    fork: false,
    url: "https://api.github.com/repos/fork-user/EIPs",
    archive_url:
        "https://api.github.com/repos/fork-user/EIPs/{archive_format}{/ref}",
    assignees_url:
        "https://api.github.com/repos/fork-user/EIPs/assignees{/user}",
    blobs_url: "https://api.github.com/repos/fork-user/EIPs/git/blobs{/sha}",
    branches_url:
        "https://api.github.com/repos/fork-user/EIPs/branches{/branch}",
    collaborators_url:
        "https://api.github.com/repos/fork-user/EIPs/collaborators{/collaborator}",
    comments_url:
        "https://api.github.com/repos/fork-user/EIPs/comments{/number}",
    commits_url: "https://api.github.com/repos/fork-user/EIPs/commits{/sha}",
    compare_url:
        "https://api.github.com/repos/fork-user/EIPs/compare/{base}...{head}",
    contents_url:
        "https://api.github.com/repos/fork-user/EIPs/contents/{+path}",
    contributors_url:
        "https://api.github.com/repos/fork-user/EIPs/contributors",
    deployments_url: "https://api.github.com/repos/fork-user/EIPs/deployments",
    downloads_url: "https://api.github.com/repos/fork-user/EIPs/downloads",
    events_url: "https://api.github.com/repos/fork-user/EIPs/events",
    forks_url: "https://api.github.com/repos/fork-user/EIPs/forks",
    git_commits_url:
        "https://api.github.com/repos/fork-user/EIPs/git/commits{/sha}",
    git_refs_url: "https://api.github.com/repos/fork-user/EIPs/git/refs{/sha}",
    git_tags_url: "https://api.github.com/repos/fork-user/EIPs/git/tags{/sha}",
    git_url: "git://github.com/fork-user/EIPs.git",
    issue_comment_url:
        "https://api.github.com/repos/fork-user/EIPs/issues/comments{/number}",
    issue_events_url:
        "https://api.github.com/repos/fork-user/EIPs/issues/events{/number}",
    issues_url: "https://api.github.com/repos/fork-user/EIPs/issues{/number}",
    keys_url: "https://api.github.com/repos/fork-user/EIPs/keys{/key_id}",
    labels_url: "https://api.github.com/repos/fork-user/EIPs/labels{/name}",
    languages_url: "https://api.github.com/repos/fork-user/EIPs/languages",
    merges_url: "https://api.github.com/repos/fork-user/EIPs/merges",
    milestones_url:
        "https://api.github.com/repos/fork-user/EIPs/milestones{/number}",
    notifications_url:
        "https://api.github.com/repos/fork-user/EIPs/notifications{?since,all,participating}",
    pulls_url: "https://api.github.com/repos/fork-user/EIPs/pulls{/number}",
    releases_url: "https://api.github.com/repos/fork-user/EIPs/releases{/id}",
    ssh_url: "", // IDK what this is
    stargazers_url: "https://api.github.com/repos/fork-user/EIPs/stargazers",
    statuses_url: "https://api.github.com/repos/fork-user/EIPs/statuses/{sha}",
    subscribers_url: "https://api.github.com/repos/fork-user/EIPs/subscribers",
    subscription_url:
        "https://api.github.com/repos/fork-user/EIPs/subscription",
    tags_url: "https://api.github.com/repos/fork-user/EIPs/tags",
    teams_url: "https://api.github.com/repos/fork-user/EIPs/teams",
    trees_url: "https://api.github.com/repos/fork-user/EIPs/git/trees{/sha}",
    clone_url: "", // IDK what this is either
    mirror_url: null,
    hooks_url: "https://api.github.com/repos/fork-user/EIPs/hooks",
    svn_url: "", // IDK what this is either
    homepage: "https://eips.ethereum.org",
    language: null,
    forks_count: 1,
    created_at: "2012-10-01T20:04:47Z",
    updated_at: "2019-10-29T19:00:00Z",
    pushed_at: "2019-10-29T19:00:00Z",
    size: 0,
    stargazers_count: 0,
    watchers_count: 0,
    default_branch: "master",
    open_issues_count: 0,
    is_template: false,
    topics: [],
    has_issues: true,
    has_projects: true,
    has_wiki: false,
    has_pages: true,
    has_downloads: true,
    archived: false,
    disabled: false,
    visibility: "public",
    license: {
        key: "CC0-1.0",
        name: "Creative Commons Zero v1.0 Universal",
        spdx_id: "CC0-1.0",
        node_id: "MDc6TGljZW5zZTY=",
        url: null,
    },
    forks: 1,
    open_issues: 0,
    watchers: 0,
    web_commit_signoff_required: false,
};
