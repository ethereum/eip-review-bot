import { Config, File, Octokit, Rule } from "../types.js";

export default async function (
    _octokit: Octokit,
    config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map((file) => {
            if (file.filename != ".wg/reviewers.yml") return [];
            return [
                {
                    name: "editors",
                    reviewers: config.editors,
                    min: 1,
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
