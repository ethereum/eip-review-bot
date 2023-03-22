import fm from "front-matter";
import { Octokit, Config, FrontMatter, File, Rule } from "../types.js";

let statusOrder = ["withdrawn", "stagnant", "draft", "review", "last call", "final", "living"];
let ignoreStatuses = ["withdrawn", "stagnant", "final", "living"];

export default async function (_octokit: Octokit, config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.endsWith(".md") || !file.filename.startsWith("EIPS/")) return [];

        let frontMatter = fm<FrontMatter>(file.previous_contents as string);
        let frontMatterNew = fm<FrontMatter>(file.contents as string);
        
        if (!("status" in frontMatter.attributes && "status" in frontMatterNew.attributes)) {
            return [{
                name: "statuschange",
                reviewers: config[(frontMatterNew.attributes?.category || frontMatterNew.attributes?.type || "governance").toLowerCase()],
                min: 1,
                annotation: {
                    file: file.filename
                },
                labels: ["e-consensus"]
            }] as Rule[]; // Fallback: require editor approval if there's missing statuses
        }
        
        let statusOld = frontMatter.attributes?.status?.toLowerCase() as string;
        let statusNew = frontMatterNew.attributes?.status?.toLowerCase() as string;
        
        if (ignoreStatuses.includes(statusOld)) {
            return []; // Handled by other rules
        }

        if (statusOrder.indexOf(statusOld) < statusOrder.indexOf(statusNew)) {
            return [{
                name: "statuschange",
                reviewers: config[(frontMatterNew.attributes?.category || frontMatterNew.attributes?.type || "governance").toLowerCase()],
                min: 1,
                annotation: {
                    file: file.filename
                },
                labels: ["e-review"]
            }] as Rule[];
        }

        return [];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
