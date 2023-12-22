import { Config, File, Octokit, Rule } from "../types.js";

export default async function (
    _octokit: Octokit,
    config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map((file) => {
            const isKnown =
                /^content\/[0-9]+(\/index)?.md$/.test(file.filename) ||
                /^content\/[0-9]+\/assets\/.*$/.test(file.filename);

            if (isKnown) {
                return []; // All of those cases are handled by the other rules
            }

            return [
                {
                    name: "unknown",
                    reviewers: config.editors,
                    min: Math.floor(config.editors.length / 2),
                    pr_approval: true,
                    annotation: {
                        file: file.filename,
                    },
                    labels: ["e-consensus"],
                },
            ];
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
