import { Octokit } from "../../types";
import checkStagnant from "../stagnant";

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
                    source_remote,
                    target_remote,
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
                    source_remote,
                    target_remote,
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
                    source_remote,
                    target_remote,
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
                    source_remote,
                    target_remote,
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
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
