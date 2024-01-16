import { Octokit } from "../../types";
import checkOtherFiles from "../unknown";

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
    test("Should require half of editors on unknown file", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { editors: ["a", "b", "c"] }, [
                {
                    filename: "foo.txt",
                    status: "modified",
                    source_remote,
                    target_remote,
                },
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
                {
                    filename: "content/00004.md",
                    status: "modified",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require reviewers on EIP file with assets", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { editors: ["a", "b", "c"] }, [
                {
                    filename: "content/00004/index.md",
                    status: "modified",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on asset file", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { editors: ["a", "b", "c"] }, [
                {
                    filename: "content/00004/assets/q.txt",
                    status: "modified",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
