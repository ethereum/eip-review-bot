import { Octokit, Config, File, Rule } from "../types";
import processFiles from "../process";

export default async function (octokit: Octokit, config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.startsWith("assets/") || files.some(f => f.filename == `EIPS/${file.filename.split("/")[2]}.md`)) return [];

        return processFiles(octokit, config, [{
            filename: `EIPS/${file.filename.split("/")[2]}.md`,
            status: 'modified'
        }]);
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
