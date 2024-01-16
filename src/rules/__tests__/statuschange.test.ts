import { Octokit } from "../../types";
import checkStatus from "../statuschange";

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

describe("checkStatus", () => {
    test("Should require one reviewer on EIP file with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in previous contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    previous_contents:
                        "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in new contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on EIP file with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on EIP file with unchanged status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    target_remote,
                    source_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require one reviewer on index.md with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "content/00001/index.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in previous contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    previous_contents:
                        "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in new contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on index.md with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on index.md with unchanged status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on non-EIP file", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
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
