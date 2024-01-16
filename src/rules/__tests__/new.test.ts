import { Octokit } from "../../types";
import checkNew from "../new";

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

describe("checkNew", () => {
    const config = { editors: ["a", "b"], members: ["c", "d"] };

    test("Should require one reviewer for new EIP", async () => {
        await expect(
            checkNew(fakeOctokit, config, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "new",
                reviewers: ["c", "d"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should return editors if working group has no members", async () => {
        await expect(
            checkNew(fakeOctokit, { editors: ["a", "b"] }, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "new",
                reviewers: ["a", "b"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on existing EIP", async () => {
        await expect(
            checkNew(fakeOctokit, config, [
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

    test("Should not require any reviewers on non-EIP file", async () => {
        await expect(
            checkNew(fakeOctokit, config, [
                {
                    filename: "hello.txt",
                    status: "added",
                    previous_contents: "Hello!",
                    contents: "Hello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
