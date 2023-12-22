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
            if (
                !file.filename.endsWith(".md") ||
                !(
                    file.filename.startsWith("EIPS/eip-") ||
                    file.filename.startsWith("ERCS/erc-")
                )
            )
                return [];

            const frontMatter = fm<FrontMatter>(
                file.previous_contents as string,
            );
            const frontMatterNew = fm<FrontMatter>(file.contents as string);

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
                ] as Rule[]; // Fallback: require editor approval if there's missing statuses
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
