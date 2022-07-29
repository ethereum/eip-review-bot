import { Octokit, Config, FrontMatter, File, Rule } from "../types";
import fm from "front-matter";

export default async function (_octokit: Octokit, _config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.endsWith(".md")) return [];

        let frontMatter = fm<FrontMatter>(file.previous_contents as string);

        if (["removed", "modified", "renamed"].includes(file.status) && frontMatter.attributes?.status != "living") { // Living EIPs should only need editor approval
            return [{
                name: "authors",
                reviewers: frontMatter.attributes.authors?.split(/\((.*?)\)/) || [],
                min: Math.ceil((frontMatter.attributes.authors?.split(/\((.*?)\)/) || []).length / 2),
                annotation: {
                    file: file.filename
                }
            }];
        }

        return [];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
