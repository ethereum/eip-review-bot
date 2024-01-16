import { Octokit } from "../../types";
import checkTerminalStatus from "../terminal";

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

describe("checkTerminalStatus", () => {
    test("Should require half of governance editors on EIP terminal file", async () => {
        await expect(
            checkTerminalStatus(
                fakeOctokit,
                { governance: ["a", "b", "c", "d"] },
                [
                    {
                        filename: "content/00001.md",
                        status: "modified",
                        previous_contents: "---\nstatus: Final\n---\nHello!",
                        source_remote,
                        target_remote,
                    },
                ],
            ),
        ).resolves.toMatchObject([
            {
                name: "terminal",
                reviewers: ["a", "b", "c", "d"],
                min: 2,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on non-terminal EIP file", async () => {
        await expect(
            checkTerminalStatus(fakeOctokit, { governance: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents: "---\nstatus: Draft\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require half of governance editors on terminal index.md", async () => {
        await expect(
            checkTerminalStatus(
                fakeOctokit,
                { governance: ["a", "b", "c", "d"] },
                [
                    {
                        filename: "content/00001/index.md",
                        status: "modified",
                        previous_contents: "---\nstatus: Final\n---\nHello!",
                        source_remote,
                        target_remote,
                    },
                ],
            ),
        ).resolves.toMatchObject([
            {
                name: "terminal",
                reviewers: ["a", "b", "c", "d"],
                min: 2,
                annotation: {
                    file: "content/00001/index.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on non-terminal index.md", async () => {
        await expect(
            checkTerminalStatus(fakeOctokit, { governance: ["a", "b", "c"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents: "---\nstatus: Draft\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on non-EIP file", async () => {
        await expect(
            checkTerminalStatus(fakeOctokit, { governance: ["a", "b", "c"] }, [
                {
                    filename: "foo.txt",
                    status: "modified",
                    contents: "Hello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
