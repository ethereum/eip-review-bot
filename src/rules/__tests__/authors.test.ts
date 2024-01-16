import { Octokit } from "../../types";
import checkAuthors from "../authors";

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

describe("checkAuthors", () => {
    test("Should require author approval for modified EIPs", async () => {
        await expect(
            checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "authors",
                reviewers: ["hello", "neet"],
                min: 1,
                pr_approval: true,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should not require author approval for added EIPs", async () => {
        await expect(
            checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require author approval for living EIPs", async () => {
        await expect(
            checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    contents:
                        "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require author approval for modified ERCs", async () => {
        await expect(
            checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "authors",
                reviewers: ["hello", "neet"],
                min: 1,
                pr_approval: true,
                annotation: {
                    file: "content/00001.md",
                },
            },
        ]);
    });

    test("Should not require author approval for added ERCs", async () => {
        await expect(
            checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "added",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require author approval for living ERCs", async () => {
        await expect(
            checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    contents:
                        "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on non-EIP file", async () => {
        await expect(
            checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [
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
