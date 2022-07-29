import { Octokit, Config, File, Rule } from "../types.js";

export default async function (_octokit: Octokit, config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (file.filename.startsWith("EIPS/") || file.filename.startsWith("assets/")) return []; // All of those cases are handled by the other rules

        return [{
            name: "unknown",
            reviewers: config.all,
            min: Math.floor(config.all.length / 2),
            annotation: {
                file: file.filename
            }
        }];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
