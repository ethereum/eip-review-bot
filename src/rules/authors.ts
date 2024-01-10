import { Config, File, FrontMatter, Octokit, Rule } from "../types.js";
import fm from "front-matter";

export default async function (
    _octokit: Octokit,
    _config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map((file) => {
            if (
                !file.filename.endsWith(".md") ||
                !(
                    file.filename.startsWith("EIPS/eip-") ||
                    file.filename.startsWith("ERCS/erc-")
                )
            ) {
                return [];
            }

            const frontMatter = fm<FrontMatter>(
                (file.previous_contents || file.contents) as string,
            );

            if (
                file.status.toLowerCase() != "added" &&
                frontMatter.attributes?.status?.toLowerCase() != "living"
            ) {
                // Living EIPs should only need editor approval
                // TODO: Workaround for https://github.com/oven-sh/bun/issues/5288
                const reviewers =
                    `,${frontMatter.attributes.author},`?.match(
                        /(?<=(?:^|,)[^<(]+\(@)(.*?)(?=\)\s*(<(("[^"]+")|([\w.]+)@[\w.]+)>)?(?:$|,))/g,
                    ) || [];
                if (reviewers.length > 0) {
                    return [
                        {
                            name: "authors",
                            reviewers: reviewers,
                            min: 1,
                            pr_approval: true,
                            annotation: {
                                file: file.filename,
                            },
                            labels: ["a-review"],
                            exclude_labels: ["e-review"],
                        },
                    ] as Rule[];
                }
            }

            return [];
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
