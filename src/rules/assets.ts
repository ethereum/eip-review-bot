import processFiles from "../process.js";
import { Config, File, Octokit, Rule } from "../types.js";

export default async function (
    octokit: Octokit,
    config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map(async (file) => {
            let filename = "";
            if (
                file.filename.startsWith("assets/eip-") &&
                !files.some(
                    (f) =>
                        f.filename == `EIPS/${file.filename.split("/")[2]}.md`,
                )
            ) {
                filename = `EIPS/${file.filename.split("/")[1]}.md`;
            } else if (
                file.filename.startsWith("assets/erc-") &&
                !files.some(
                    (f) =>
                        f.filename == `ERCS/${file.filename.split("/")[2]}.md`,
                )
            ) {
                filename = `ERCS/${file.filename.split("/")[1]}.md`;
            }
            if (filename == "") {
                return []; // Not an asset file
            }
            if (files.some((file) => file.filename == filename)) {
                return []; // Already covered by the relevant rules, so avoid potential conflicts by short circuiting
            }
            return processFiles(octokit, config, [
                {
                    filename,
                    status: "modified",
                },
            ]);
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
