import { Octokit } from "../../types";
import checkStagnant from "../stagnant";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkStagnant", () => {
    test("Should require one reviewer on EIP resurrection", async () => {
        await expect(
            checkStagnant(fakeOctokit, { erc: ["a", "b", "c", "d"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Stagnant\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "stagnant",
                reviewers: ["a", "b", "c", "d"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on EIP file with irrelevant status", async () => {
        await expect(
            checkStagnant(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Final\ncategory: ERC\n---\nHello!",
                    contents:
                        "---\nstatus: Last Call\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require one reviewer on index.md resurrection", async () => {
        await expect(
            checkStagnant(fakeOctokit, { erc: ["a", "b", "c", "d"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Stagnant\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "stagnant",
                reviewers: ["a", "b", "c", "d"],
                min: 1,
                annotation: {
                    file: "content/00001/index.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on index.md with irrelevant status", async () => {
        await expect(
            checkStagnant(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Final\ncategory: ERC\n---\nHello!",
                    contents:
                        "---\nstatus: Last Call\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on non-EIP file", async () => {
        await expect(
            checkStagnant(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "hello.txt",
                    status: "modified",
                    previous_contents: "Hello!",
                    contents: "Hello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
