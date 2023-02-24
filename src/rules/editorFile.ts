import { Octokit, Config, File, Rule } from "../types.js";

export default async function (_octokit: Octokit, config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (file.filename != "config/eip-editors.yml") return [];
        return [{
            name: "editors",
            reviewers: config.governance,
            min: Math.max(config.governance.length - 1, Math.min(config.governance.length, 2)),
            pr_approval: true,
            annotation: {
                file: file.filename
            },
            labels: ["e-consensus"]
        }] as Rule[];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
