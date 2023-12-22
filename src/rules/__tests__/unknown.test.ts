import { Octokit } from "../../types";
import checkOtherFiles from "../unknown";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkOtherFiles", () => {
    test("Should require half of editors on unknown file", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { editors: ["a", "b", "c"] }, [
                { filename: "foo.txt", status: "modified" },
            ]),
        ).resolves.toMatchObject([
            {
                name: "unknown",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "foo.txt",
                },
            },
        ]);
    });

    test("Should not require reviewers on EIP file", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { editors: ["a", "b", "c"] }, [
                { filename: "content/00004.md", status: "modified" },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require reviewers on EIP file with assets", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { editors: ["a", "b", "c"] }, [
                { filename: "content/00004/index.md", status: "modified" },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on asset file", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { editors: ["a", "b", "c"] }, [
                { filename: "content/00004/assets/q.txt", status: "modified" },
            ]),
        ).resolves.toMatchObject([]);
    });
});
