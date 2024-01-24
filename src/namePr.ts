import localConfig from "./localConfig";
import {
    eipNumber,
    isConfig,
    isProposal,
    isStatic,
    isTemplate,
    isTheme,
} from "./paths";
import type { File, FrontMatter } from "./types";
import type { PullRequest } from "@octokit/webhooks-types";
import fm from "front-matter";

export function generatePRTitle(pull_request: PullRequest, files: File[]) {
    // Get PR title, ignoring the prefix before the first colon
    let title = pull_request.title;
    const user = pull_request.user;

    // Ignore PRs from Renovate
    if (user?.login == "renovate[bot]") {
        return title;
    }

    if (title.match(":")) {
        title = title.split(":").slice(1).join(":").trim();
    }

    // If the PR modifies the website, use Website prefix unless the beginning portion is for EIP-1
    const isWeb = files.some(
        (file) => isStatic(file) || isTemplate(file) || isTheme(file),
    );
    if (isWeb) {
        return localConfig.title.websitePrefix + title;
    }

    // If the PR changes a file in the .github/workflows directory, use CI prefix
    if (files.some((file) => file.filename.startsWith(".github/workflows"))) {
        return localConfig.title.ciPrefix + title;
    }

    // If the PR changes a file in the config or .github directory, use Config prefix
    const hasConfig = files.some(
        (file) => isConfig(file) || file.filename.startsWith(".github"),
    );
    if (hasConfig) {
        return localConfig.title.configPrefix + title;
    }

    // If the PR modifies the template, use Update Template
    if (files.some((file) => file.filename === "docs/template.md")) {
        return (
            localConfig.title.updateEipPrefix.replace("EIP-XXXX", "Template") +
            title
        );
    }

    // If the PR modifies the EIP README, use Update README
    if (files.some((file) => file.filename === "README.md")) {
        return (
            localConfig.title.updateEipPrefix.replace("EIP-XXXX", "README") +
            title
        );
    }

    // If the PR adds a new EIP, use Add EIP prefix
    const addedProposal = files.find(
        (file) => isProposal(file) && file.status === "added",
    );
    if (addedProposal) {
        const contents = addedProposal?.contents;
        if (!contents) {
            return false;
        }

        const frontMatter = fm<FrontMatter>(contents);
        if (!frontMatter.attributes?.title) {
            return false;
        }

        return localConfig.title.addEipPrefix + frontMatter.attributes?.title;
    }

    // If the PR updates an existing EIP's status, use Update EIP prefix and custom title
    const reStatus = /(?<=status:\W?)\w[^\r\n]*/g;
    const statusProposal = files.find(
        (file) =>
            isProposal(file) &&
            file.status === "modified" &&
            file.contents?.match(reStatus)?.[0] !=
                file.previous_contents?.match(reStatus)?.[0],
    );

    if (statusProposal) {
        const num = eipNumber(statusProposal).toString();
        const newStatus = statusProposal.contents?.match(reStatus)?.[0];
        return (
            localConfig.title.updateEipPrefix.replace("XXXX", num) +
            `Move to ${newStatus}`
        );
    }

    // Otherwise, if the PR changes an existing EIP, use Update EIP prefix
    const updatedProposal = files.find(
        (file) => isProposal(file) && file.status === "modified",
    );

    if (updatedProposal) {
        const num = eipNumber(updatedProposal).toString();
        return localConfig.title.updateEipPrefix.replace("XXXX", num) + title;
    }

    // Default to the PR title
    return false;
}
