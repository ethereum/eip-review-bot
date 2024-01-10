import localConfig from "./localConfig";
import type { File } from "./types";
import type { FrontMatter } from "./types";
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

    let beginnningPortion;
    if (title.match(":")) {
        beginnningPortion = title.split(":")[0].trim();
        title = title.split(":").slice(1).join(":").trim();
    }

    // If the PR modifies the website, use Website prefix unless the beginning portion is for EIP-1
    if (
        files.some(
            (file) =>
                file.filename.endsWith(".html") ||
                file.filename.endsWith(".js") ||
                file.filename.endsWith(".css") ||
                (file.filename.startsWith("assets/") &&
                    !file.filename.startsWith("assets/eip-") &&
                    !file.filename.startsWith("assets/erc-")),
        ) &&
        (!beginnningPortion ||
            !beginnningPortion.toLowerCase().endsWith("eip-1"))
    ) {
        return localConfig.title.websitePrefix + title;
    }

    // If the PR modifies EIP-1, indicate that
    if (files.some((file) => file.filename == "EIPS/eip-1.md")) {
        return (
            localConfig.title.updateEipPrefix.replace("EIP-XXXX", "EIP-1") +
            title
        );
    }

    // If the PR modifies ERC-1, indicate that
    if (files.some((file) => file.filename == "ERCS/erc-1.md")) {
        return (
            localConfig.title.updateEipPrefix.replace("EIP-XXXX", "ERC-1") +
            title
        );
    }

    // If the PR changes a file in the .github/workflows directory, use CI prefix
    if (files.some((file) => file.filename.startsWith(".github/workflows"))) {
        return localConfig.title.ciPrefix + title;
    }

    // If the PR changes a file in the config or .github directory, use Config prefix
    if (
        files.some((file) => file.filename.startsWith("config/")) ||
        files.some((file) => file.filename.startsWith(".github"))
    ) {
        return localConfig.title.configPrefix + title;
    }

    // If the PR modifies the template, use Update Template
    if (
        files.some(
            (file) =>
                file.filename === "eip-template.md" ||
                file.filename === "erc-template.md",
        )
    ) {
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
    if (
        files.some(
            (file) =>
                file.filename.startsWith("EIPS/eip-") &&
                file.status === "added",
        )
    ) {
        const theFile = files.find(
            (file) =>
                file.filename.startsWith("EIPS/eip-") &&
                file.status === "added",
        );
        const frontMatter = fm<FrontMatter>(theFile?.contents as string);
        if (!frontMatter.attributes?.title) {
            return false;
        }
        return localConfig.title.addEipPrefix + frontMatter.attributes?.title;
    }

    // If the PR adds a new ERC, use Add ERC prefix
    if (
        files.some(
            (file) =>
                file.filename.startsWith("ERCS/erc-") &&
                file.status === "added",
        )
    ) {
        const theFile = files.find(
            (file) =>
                file.filename.startsWith("ERCS/erc-") &&
                file.status === "added",
        );
        const frontMatter = fm<FrontMatter>(theFile?.contents as string);
        if (!frontMatter.attributes?.title) {
            return false;
        }
        return (
            localConfig.title.addEipPrefix.replace("EIP", "ERC") +
            frontMatter.attributes?.title
        );
    }

    // If the PR updates an existing EIP's status, use Update EIP prefix and custom title
    if (
        files.some(
            (file) =>
                file.filename.startsWith("EIPS/eip-") &&
                file.status === "modified" &&
                file.contents?.match(/(?<=status:\W?)\w[^\r\n]*/g)?.[0] !=
                    file.previous_contents?.match(
                        /(?<=status:\W?)\w[^\r\n]*/g,
                    )?.[0],
        )
    ) {
        const eipNumber = files
            .find(
                (file) =>
                    file.filename.startsWith("EIPS/eip-") &&
                    file.status === "modified",
            )
            ?.filename.split("/")[1]
            .split(".")[0]
            .split("-")[1] as string;
        const newStatus = files
            .find(
                (file) =>
                    file.filename.startsWith("EIPS/eip-") &&
                    file.status === "modified" &&
                    file.contents?.match(/(?<=status:\W?)\w[^\r\n]*/g)?.[0] !=
                        file.previous_contents?.match(
                            /(?<=status:\W?)\w[^\r\n]*/g,
                        )?.[0],
            )
            ?.contents?.match(/(?<=status:\W?)\w[^\r\n]*/g)?.[0];
        return (
            localConfig.title.updateEipPrefix.replace("XXXX", eipNumber) +
            `Move to ${newStatus}`
        );
    }

    // If the PR updates an existing ERC's status, use Update ERC prefix and custom title
    if (
        files.some(
            (file) =>
                file.filename.startsWith("ERCS/erc-") &&
                file.status === "modified" &&
                file.contents?.match(/(?<=status:\W?)\w[^\r\n]*/g)?.[0] !=
                    file.previous_contents?.match(
                        /(?<=status:\W?)\w[^\r\n]*/g,
                    )?.[0],
        )
    ) {
        const eipNumber = files
            .find(
                (file) =>
                    file.filename.startsWith("ERCS/erc-") &&
                    file.status === "modified",
            )
            ?.filename.split("/")[1]
            .split(".")[0]
            .split("-")[1] as string;
        const newStatus = files
            .find(
                (file) =>
                    file.filename.startsWith("ERCS/erc-") &&
                    file.status === "modified" &&
                    file.contents?.match(/(?<=status:\W?)\w[^\r\n]*/g)?.[0] !=
                        file.previous_contents?.match(
                            /(?<=status:\W?)\w[^\r\n]*/g,
                        )?.[0],
            )
            ?.contents?.match(/(?<=status:\W?)\w[^\r\n]*/g)?.[0];
        return (
            localConfig.title.updateEipPrefix.replace(
                "EIP-XXXX",
                "ERC-" + eipNumber,
            ) + `Move to ${newStatus}`
        );
    }

    // Otherwise, if the PR changes an existing EIP, use Update EIP prefix
    if (
        files.some(
            (file) =>
                file.filename.startsWith("EIPS/eip-") &&
                file.status === "modified",
        )
    ) {
        const eipNumber = files
            .find(
                (file) =>
                    file.filename.startsWith("EIPS/eip-") &&
                    file.status === "modified",
            )
            ?.filename.split("/")[1]
            .split(".")[0]
            .split("-")[1] as string;
        return (
            localConfig.title.updateEipPrefix.replace("XXXX", eipNumber) + title
        );
    }

    // Otherwise, if the PR changes an existing ERC, use Update ERC prefix
    if (
        files.some(
            (file) =>
                file.filename.startsWith("ERCS/erc-") &&
                file.status === "modified",
        )
    ) {
        const eipNumber = files
            .find(
                (file) =>
                    file.filename.startsWith("ERCS/erc-") &&
                    file.status === "modified",
            )
            ?.filename.split("/")[1]
            .split(".")[0]
            .split("-")[1] as string;
        return (
            localConfig.title.updateEipPrefix.replace(
                "EIP-XXXX",
                "ERC-" + eipNumber,
            ) + title
        );
    }

    // Default to the PR title
    return false;
}
