import { Octokit } from "../../types";
import checkTerminalStatus from "../terminal";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

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
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on non-EIP file", async () => {
        await expect(
            checkTerminalStatus(fakeOctokit, { governance: ["a", "b", "c"] }, [
                { filename: "foo.txt", status: "modified", contents: "Hello!" },
            ]),
        ).resolves.toMatchObject([]);
    });
});
