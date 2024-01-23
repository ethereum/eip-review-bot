import { Config, File, FrontMatter, Octokit, Rule } from "../types.js";
import { isProposal } from "../utils.js";
import fm from "front-matter";

const RE_AUTHORS =
    /(?<=(?:^|,)[^<(]+\(@)(.*?)(?=\)\s*(<(("[^"]+")|([\w.]+)@[\w.]+)>)?(?:$|,))/g;

export default async function (
    _octokit: Octokit,
    _config: Config,
    files: File[],
): Promise<Rule[]> {
    // Get results
    const res: Rule[][] = await Promise.all(
        files.map((file) => {
            const considerFile =
                file.status.toLowerCase() != "added" && isProposal(file);

            if (!considerFile) {
                return [];
            }

            const contents = file.previous_contents || file.contents;
            if (typeof contents !== "string") {
                throw new Error(`'${file.filename}' non-string contents`);
            }

            const frontMatter = fm<FrontMatter>(contents);

            // Living EIPs should only need editor approval
            if (frontMatter.attributes?.status?.toLowerCase() == "living") {
                return [];
            }

            // TODO: Workaround for https://github.com/oven-sh/bun/issues/5288
            const reviewers =
                `,${frontMatter.attributes.author},`?.match(RE_AUTHORS) || [];
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
                ];
            }

            return [];
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
