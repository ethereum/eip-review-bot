import { Config, File, FrontMatter, Octokit, Rule } from "../types.js";
import fm from "front-matter";

export default async function (
    _octokit: Octokit,
    config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map((file) => {
            const considerFile = /^content\/[0-9]+(\/index)?.md$/.test(
                file.filename,
            );
            if (!considerFile) {
                return [];
            }

            const contents = file.previous_contents;
            if (typeof contents !== "string") {
                throw new Error(`'${file.filename}' non-string contents`);
            }

            const frontMatter = fm<FrontMatter>(contents);
            const status = frontMatter.attributes?.status?.toLowerCase();

            if (status == "stagnant") {
                return [
                    {
                        name: "stagnant",
                        reviewers:
                            config[
                                (
                                    frontMatter.attributes?.category ||
                                    frontMatter.attributes?.type ||
                                    "governance"
                                ).toLowerCase()
                            ],
                        min: 1,
                        pr_approval: true,
                        annotation: {
                            file: file.filename,
                        },
                        labels: ["e-review"],
                    },
                ] as Rule[];
            }

            return [];
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
