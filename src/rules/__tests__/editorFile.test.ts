import { Octokit } from "../../types";
import checkEditorFile from "../editorFile";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

const source_remote = {
    owner: "ausername",
    repo: "EIPS",
    ref: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

const target_remote = {
    owner: "ethereum",
    repo: "EIPS",
    ref: "5c5bcf09cdddb3150774e83e295d99e38a4a4a3a",
};

describe("checkOtherFiles", () => {
    test("Should require editors on reviewer file", async () => {
        await expect(
            checkEditorFile(fakeOctokit, { editors: ["a", "b", "c"] }, [
                {
                    filename: ".wg/reviewers.yml",
                    status: "modified",
                    source_remote,
                    target_remote,
                },
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
                {
                    filename: "content/00002.md",
                    status: "modified",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
