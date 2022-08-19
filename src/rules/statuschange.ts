import fm from "front-matter";
import { Octokit, Config, FrontMatter, File, Rule } from "../types.js";

let statusOrder = ["withdrawn", "stagnant", "draft", "review", "last call", "final", "living"];

export default async function (_octokit: Octokit, config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.endsWith(".md")) return [];

        let frontMatter = fm<FrontMatter>(file.previous_contents as string);
        let frontMatterNew = fm<FrontMatter>(file.contents as string);
        
        let statusOld = frontMatter.attributes?.status?.toLowerCase();
        let statusNew = frontMatterNew.attributes?.status?.toLowerCase();

        if (statusOrder.indexOf(statusOld) < statusOrder.indexOf(statusNew)) {
            return [{
                name: "statuschange",
                reviewers: config[(frontMatterNew.attributes?.category || frontMatterNew.attributes?.type || "all").toLowerCase()],
                min: 1,
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
