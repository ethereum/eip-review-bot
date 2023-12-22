import checkAssets from "./rules/assets.js";
import checkAuthors from "./rules/authors.js";
import checkEditorFile from "./rules/editorFile.js";
import checkNew from "./rules/new.js";
import checkStagnant from "./rules/stagnant.js";
import checkStatus from "./rules/statuschange.js";
import checkTerminalStatus from "./rules/terminal.js";
import checkOtherFiles from "./rules/unknown.js";
import { Config, File, Octokit, Rule } from "./types.js";

const rules = [
    checkAssets,
    checkAuthors,
    checkNew,
    checkStatus,
    checkStagnant,
    checkTerminalStatus,
    checkEditorFile,
    checkOtherFiles,
];

export default async function (
    octokit: Octokit,
    config: Config,
    files: File[],
) {
    // Get results
    const res: Rule[][] = await Promise.all(
        rules.map((rule) => rule(octokit, config, files)),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
