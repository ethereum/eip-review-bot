import { Octokit } from "../../types";
import checkNew from "../new";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkNew", () => {
    test("Should require one reviewer for new EIP", async () => {
        await expect(
            checkNew(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "added",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "new",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "EIPS/eip-1.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on existing EIP", async () => {
        await expect(
            checkNew(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Final\ncategory: ERC\n---\nHello!",
                    contents:
                        "---\nstatus: Last Call\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require one reviewer for new ERC", async () => {
        await expect(
            checkNew(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
                    status: "added",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "new",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "ERCS/erc-1.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on existing ERC", async () => {
        await expect(
            checkNew(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
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
            checkNew(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "hello.txt",
                    status: "added",
                    previous_contents: "Hello!",
                    contents: "Hello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
