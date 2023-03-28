import type { Octokit, Config, File } from "./types";
import type { Repository } from "@octokit/webhooks-types";
import type { FrontMatter } from "./types";
import localConfig from "./localConfig";
import fm from "front-matter";

export async function generatePRTitle(octokit: Octokit, _: Config, repository: Repository, pull_number: number, files: File[]) {
    // Get PR title, ignoring the prefix before the first colon
    let { title, user } = (await octokit.rest.pulls.get({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_number
    })).data;

    // Ignore PRs from Renovate
    if (user?.login == "renovate[bot]") {
        return title;
    }
    
    if (title.match(":")) {
        title = title.split(":").slice(1).join(":").trim();
    }
    

    // If the PR modifies the website, use Website prefix
    if (files.some(file => file.filename.endsWith(".html") || file.filename.endsWith(".vue") || (file.filename.startsWith("assets/") && !file.filename.startsWith("assets/eip-") || file.filename.startsWith(".vitepress")))) {
        return localConfig.title.websitePrefix + title;
    }
    
    // If the PR modifies EIP-1, indicate that
    if (files.some(file => file.filename == "EIPS/eip-1.md")) {
        return localConfig.title.updateEipPrefix.replace("EIP-XXXX", "EIP-1") + title;
    }
    
    // If the PR changes a file in the .github/workflows directory, use CI prefix
    if (files.some(file => file.filename.startsWith(".github/workflows"))) {
        return localConfig.title.ciPrefix + title;
    }

    // If the PR changes a file in the config or .github directory, use Config prefix
    if (files.some(file => file.filename.startsWith("config/")) || files.some(file => file.filename.startsWith(".github"))) {
        return localConfig.title.configPrefix + title;
    }

    // If the PR modifies the EIP template, use Update Template
    if (files.some(file => file.filename === "eip-template.md")) {
        return localConfig.title.updateEipPrefix.replace("EIP-XXXX", "Template") + title;
    }

    // If the PR modifies the EIP README, use Update README
    if (files.some(file => file.filename === "README.md")) {
        return localConfig.title.updateEipPrefix.replace("EIP-XXXX", "README") + title;
    }

    // If the PR adds a new EIP, use Add EIP prefix
    if (files.some(file => file.filename.startsWith("EIPS/eip-") && file.status === "added")) {
        let theFile = files.find(file => file.filename.startsWith("EIPS/eip-") && file.status === "added");
        let frontMatter = fm<FrontMatter>(theFile?.contents as string);
        return localConfig.title.addEipPrefix + frontMatter.attributes?.title;
    }

    // If the PR updates an existing EIP's status, use Update EIP prefix and custom title
    if (files.some(file => file.filename.startsWith("EIPS/eip-") && file.status === "modified" && file.patch?.includes("+status:"))) {
        let eipNumber = files.find(file => file.filename.startsWith("EIPS/eip-") && file.status === "modified" && file.patch?.includes("+status:"))?.filename.split("/")[1].split(".")[0].split("-")[1] as string;
        let newStatus = files.find(file => file.filename.startsWith("EIPS/eip-") && file.status === "modified" && file.patch?.includes("+status:"))?.patch?.match(/(?<=\+status:\W?)\w[^\r\n]*/g)?.[0] as string;
        return localConfig.title.updateEipPrefix.replace("XXXX", eipNumber) + `Move to ${newStatus}`;
    }

    // Otherwise, if the PR changes an existing EIP, use Update EIP prefix
    if (files.some(file => file.filename.startsWith("EIPS/eip-") && file.status === "modified")) {
        let eipNumber = files.find(file => file.filename.startsWith("EIPS/eip-") && file.status === "modified")?.filename.split("/")[1].split(".")[0].split("-")[1] as string;
        return localConfig.title.updateEipPrefix.replace("XXXX", eipNumber) + title;
    }

    // Default to the PR title
    return title;
}
