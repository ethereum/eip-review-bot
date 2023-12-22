import { Octokit } from "../../types";
import checkNew from "../new";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkNew", () => {
    const config = { editors: ["a", "b"], members: ["c", "d"] };

    test("Should require one reviewer for new EIP", async () => {
        await expect(
            checkNew(fakeOctokit, config, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
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
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
