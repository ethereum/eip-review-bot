import { Octokit, Config, FrontMatter, File, Rule } from "../types.js";
import fm from "front-matter";

export default async function (_octokit: Octokit, _config: Config, files: File[]) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.endsWith(".md") || !file.filename.startsWith("EIPS/eip-")) {
            return [];
        }

        let frontMatter = fm<FrontMatter>((file.previous_contents || file.contents) as string);

        if (file.status.toLowerCase() != 'added' && frontMatter.attributes?.status?.toLowerCase() != "living") { // Living EIPs should only need editor approval
            let reviewers = frontMatter.attributes.author?.match(/(?<=(?:^|,)[^<(]+\(@)(.*?)(?=\)\s*(<(("[^"]+")|([\w.]+)@[\w.]+)>)?(?:$|,))/g) || [];
            if (reviewers.length > 0) {
                return [{
                    name: "authors",
                    reviewers: reviewers,
                    min: 1,
                    pr_approval: true,
                    annotation: {
                        file: file.filename
                    },
                    labels: ["a-review"],
                    exclude_labels: ["e-review"]
                }] as Rule[];
            }
        }

        return [];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
