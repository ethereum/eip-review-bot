import { Config, File, Octokit, Rule } from "../types.js";

export default async function (
    _octokit: Octokit,
    config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map((file) => {
            if (file.filename != "config/eip-editors.yml") return [];
            return [
                {
                    name: "editors",
                    reviewers: config.governance,
                    min: Math.max(
                        config.governance.length - 1,
                        Math.min(config.governance.length, 2),
                    ),
                    pr_approval: true,
                    annotation: {
                        file: file.filename,
                    },
                    labels: ["e-consensus"],
                },
            ] as Rule[];
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
