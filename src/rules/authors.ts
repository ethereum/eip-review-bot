import { Octokit, Config, FrontMatter, File, Rule } from "../types.js";
import fm from "front-matter";

export default async function (_octokit: Octokit, _config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        console.log(`Debug test authors: ${file.filename}`);
        if (!file.filename.endsWith(".md") || !file.filename.startsWith("EIPS")) {
            console.log(`Debug: ${file.filename} not EIP`);
            return [];
        }

        let frontMatter = fm<FrontMatter>((file.previous_contents || file.contents) as string);

        if (file.status.toLowerCase() != 'added' && frontMatter.attributes?.status?.toLowerCase() != "living") { // Living EIPs should only need editor approval
            console.log(`Debug: ${file.filename} author applies ${JSON.stringify(frontMatter.attributes.authors?.split(/\(@(.*?)\)/).filter((_, index) => index % 2 === 1), null, 2)}`);
            return [{
                name: "authors",
                reviewers: frontMatter.attributes.authors?.split(/\(@(.*?)\)/).filter((_, index) => index % 2 === 1) || [],
                min: 1,
                annotation: {
                    file: file.filename
                }
            }];
        }
        console.log(`Debug: ${file.filename} author does not apply; ${file.status.toLowerCase()} ${frontMatter.attributes?.status?.toLowerCase()}`);

        return [];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
