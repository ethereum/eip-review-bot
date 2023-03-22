import { Octokit, Config, File, Rule } from "../types.js";
import processFiles from "../process.js";

export default async function (octokit: Octokit, config: Config, files: File[] ) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (!file.filename.startsWith("assets/") || files.some(f => f.filename == `EIPS/${file.filename.split("/")[2]}.md`)) return [];

        return processFiles(octokit, config, [{
            filename: `EIPS/${file.filename.split("/")[1]}.md`,
            status: 'modified',
        }], false);
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
