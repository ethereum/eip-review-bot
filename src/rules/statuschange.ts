import { Config, File, FrontMatter, Octokit, Rule } from "../types.js";
import fm from "front-matter";

const statusOrder = [
    "withdrawn",
    "stagnant",
    "draft",
    "review",
    "last call",
    "final",
    "living",
];
const ignoreStatuses = ["withdrawn", "stagnant", "final", "living"];

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

            const oldContents = file.previous_contents;
            if (typeof oldContents !== "string") {
                throw new Error(
                    `'${file.filename}' non-string previous contents`,
                );
            }

            const newContents = file.contents;
            if (typeof newContents !== "string") {
                throw new Error(`'${file.filename}' non-string contents`);
            }

            const frontMatterNew = fm<FrontMatter>(newContents);
            const frontMatter = fm<FrontMatter>(oldContents);

            if (
                !(
                    "status" in frontMatter.attributes &&
                    "status" in frontMatterNew.attributes
                )
            ) {
                return [
                    {
                        name: "statuschange",
                        reviewers:
                            config[
                                (
                                    frontMatterNew.attributes?.category ||
                                    frontMatterNew.attributes?.type ||
                                    "governance"
                                ).toLowerCase()
                            ],
                        min: 1,
                        annotation: {
                            file: file.filename,
                        },
                        labels: ["e-consensus"],
                    },
                ]; // Fallback: require editor approval if there's missing statuses
            }

            const statusOld = frontMatter.attributes?.status?.toLowerCase();
            const statusNew = frontMatterNew.attributes?.status?.toLowerCase();

            if (ignoreStatuses.includes(statusOld)) {
                return []; // Handled by other rules
            }

            if (
                statusOrder.indexOf(statusOld) < statusOrder.indexOf(statusNew)
            ) {
                return [
                    {
                        name: "statuschange",
                        reviewers:
                            config[
                                (
                                    frontMatterNew.attributes?.category ||
                                    frontMatterNew.attributes?.type ||
                                    "governance"
                                ).toLowerCase()
                            ],
                        min: 1,
                        annotation: {
                            file: file.filename,
                        },
                        labels: ["e-review"],
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
