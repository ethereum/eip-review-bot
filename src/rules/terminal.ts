import fm from "front-matter";
import { Octokit, Config, FrontMatter, File, Rule } from "../types.js";

export default async function (_octokit: Octokit, config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.endsWith(".md")) return [];

        let frontMatter = fm<FrontMatter>(file.previous_contents as string);
        let status = frontMatter.attributes?.status?.toLowerCase() as string;
        
        if (["living", "final", "withdrawn"].includes(status)) {
            let authors: string[] = frontMatter.attributes.author?.match(/(?<=(?:^|,)[^<(]+\(@)(.*?)(?=\)(?:$|,))/g) || [];
            let pr_approval = false;
            let min = Math.floor(config.governance.length / 2);
            for (let editor of config.governance) {
                if (authors.includes(editor)) {
                    pr_approval = true;
                    min = 1;
                    break;
                }
            }
            return [{
                name: "terminal",
                reviewers: config.governance,
                min,
                pr_approval,
                annotation: {
                    file: file.filename
                },
                labels: ["e-consensus"],
                exclude_labels: ["a-review"]
            }] as Rule[];
        }

        return [];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
