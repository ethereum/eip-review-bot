import processFiles from "../process.js";
import { Config, File, Octokit, Rule } from "../types.js";

export default async function (
    octokit: Octokit,
    config: Config,
    files: File[],
): Promise<Rule[]> {
    const reEip = /^content\/([0-9]+)(?:\/index)?.md$/;
    const modified: Map<number, string> = new Map();
    for (const file of files) {
        const match = file.filename.match(reEip);
        if (!match) {
            continue;
        }

        modified.set(Number.parseInt(match[1]), match[0]);
    }

    // Get results
    const res: Rule[][] = await Promise.all(
        files.map(async (file) => {
            // Extract the EIP number from the path.
            const match = file.filename.match(
                /^content\/([0-9]+)\/assets\/.*$/,
            );
            if (!match) {
                return [];
            }

            const eipNumber = Number.parseInt(match[1]);

            // Check if the corresponding markdown file was modified.
            if (modified.has(eipNumber)) {
                // If it is, it's already covered by the relevant rules, so
                // avoid potential conflicts by returning early.
                return [];
            }

            const filename = `content/${match[1]}.md`;

            // Prevent duplicates.
            modified.set(eipNumber, filename);

            // Fetch contents.
            const [content, previous_content] = await Promise.all([
                octokit.rest.repos.getContent({
                    mediaType: {
                        format: "raw",
                    },
                    path: filename,
                    ...file.source_remote,
                }),
                octokit.rest.repos.getContent({
                    mediaType: {
                        format: "raw",
                    },
                    path: filename,
                    ...file.target_remote,
                }),
            ]);

            let contents: string | undefined;
            let previous_contents: string | undefined;

            if (!Array.isArray(content.data)) {
                if (content.data.type === "file") {
                    contents = content.data.content;
                }
            }

            if (!Array.isArray(previous_content.data)) {
                if (previous_content.data.type === "file") {
                    previous_contents = previous_content.data.content;
                }
            }

            return await processFiles(octokit, config, [
                {
                    filename,
                    status: "modified",
                    contents,
                    previous_contents,
                    target_remote: file.target_remote,
                    source_remote: file.source_remote,
                },
            ]);
        }),
    );

    // Merge results
    const ret: Rule[] = [];
    res.forEach((val) => ret.push(...val));
    return ret;
}
