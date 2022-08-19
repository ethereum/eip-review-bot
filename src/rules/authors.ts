import { Octokit, Config, FrontMatter, File, Rule } from "../types.js";
import fm from "front-matter";

export default async function (_octokit: Octokit, _config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.endsWith(".md") || !file.filename.startsWith("EIPS")) {
            return [];
        }

        let frontMatter = fm<FrontMatter>((file.previous_contents || file.contents) as string);

        if (file.status.toLowerCase() != 'added' && frontMatter.attributes?.status?.toLowerCase() != "living") { // Living EIPs should only need editor approval
            let reviewers = frontMatter.attributes.author?.split(/\(@(.*?)\)/).filter((_, index) => index % 2 === 1) || [];
            if (reviewers.length > 0) {
                return [{
                    name: "authors",
                    reviewers: reviewers,
                    min: 1,
                    annotation: {
                        file: file.filename
                    }
                }];
            }
        }

        return [];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
