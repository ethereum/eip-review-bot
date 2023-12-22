import { Octokit } from "../../types";
import checkEditorFile from "../editorFile";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkOtherFiles", () => {
    test("Should require editors on reviewer file", async () => {
        await expect(
            checkEditorFile(fakeOctokit, { editors: ["a", "b", "c"] }, [
                { filename: ".wg/reviewers.yml", status: "modified" },
            ]),
        ).resolves.toMatchObject([
            {
                name: "editors",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: ".wg/reviewers.yml",
                },
            },
        ]);
    });

    test("Should not require any reviewers on known file", async () => {
        await expect(
            checkEditorFile(fakeOctokit, { editors: ["a", "b", "c"] }, [
                { filename: "content/00002.md", status: "modified" },
            ]),
        ).resolves.toMatchObject([]);
    });
});
