import { Octokit } from "../../types";
import checkStatus from "../statuschange";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkStatus", () => {
    test("Should require one reviewer on EIP file with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "EIPS/eip-1.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in previous contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "added",
                    previous_contents:
                        "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "EIPS/eip-1.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in new contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "added",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "EIPS/eip-1.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on EIP file with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on EIP file with unchanged status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "EIPS/eip-1.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require one reviewer on ERC file with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "ERCS/erc-1.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in previous contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
                    status: "added",
                    previous_contents:
                        "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "ERCS/erc-1.md",
                },
            },
        ]);
    });

    test("Should require one reviewer on missing status in new contents", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
                    status: "added",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\ntest: asdf\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "statuschange",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "ERCS/erc-1.md",
                },
            },
        ]);
    });

    test("Should not require any reviewers on ERC file with downgraded status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Review\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on ERC file with unchanged status", async () => {
        await expect(
            checkStatus(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "ERCS/erc-1.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
                    contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!",
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
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
