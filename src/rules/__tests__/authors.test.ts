import { Octokit } from "../../types";
import checkAuthors from "../authors";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

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
                },
            ]),
        ).resolves.toMatchObject([]);
    });
});
