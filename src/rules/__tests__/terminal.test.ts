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
                        filename: "EIPS/eip-1.md",
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
                    file: "EIPS/eip-1.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on non-terminal EIP file", async () => {
        await expect(
            checkTerminalStatus(fakeOctokit, { governance: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "modified",
                    previous_contents: "---\nstatus: Draft\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require half of governance editors on ERC terminal file", async () => {
        await expect(
            checkTerminalStatus(
                fakeOctokit,
                { governance: ["a", "b", "c", "d"] },
                [
                    {
                        filename: "ERCS/erc-1.md",
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
                    file: "ERCS/erc-1.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on non-terminal ERC file", async () => {
        await expect(
            checkTerminalStatus(fakeOctokit, { governance: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
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
