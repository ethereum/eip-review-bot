import { Octokit, Config, File, Rule } from "../types.js";
import processFiles from "../process.js";

export default async function (octokit: Octokit, config: Config, files: File[]) : Promise<Rule[]> {
    // Get results
    let res : Rule[][] = await Promise.all(files.map(async file => {
        if (file.filename.startsWith("assets/eip-") && !files.some(f => f.filename == `EIPS/${file.filename.split("/")[2]}.md`)) {
            return processFiles(octokit, config, [{
                filename: `EIPS/${file.filename.split("/")[1]}.md`,
                status: 'modified',
            }]);
        } else if (file.filename.startsWith("assets/erc-") && !files.some(f => f.filename == `ERCS/${file.filename.split("/")[2]}.md`)) {
            return processFiles(octokit, config, [{
                filename: `ERCS/${file.filename.split("/")[1]}.md`,
                status: 'modified',
            }]);
        }
        return [];
    }));

    // Merge results
    let ret: Rule[] = [];
    res.forEach(val => ret.push(...val));
    return ret;
}
