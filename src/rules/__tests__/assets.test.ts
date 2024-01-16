import { generateMockOctokit } from "../../__tests__/generateMockOctokit";
import { Octokit } from "../../types";
import checkAssets from "../assets";

const fakeOctokit: Octokit = generateMockOctokit();

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

describe("checkAssets", () => {
    test("Should require no approvals for non-EIP files", async () => {
        await expect(
            checkAssets(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "eip-template.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require no approvals for non-asset files", async () => {
        await expect(
            checkAssets(fakeOctokit, { erc: ["a", "b", "c"] }, [
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
        ).resolves.toMatchObject([]);
    });

    test("Should require no approvals for index.md files", async () => {
        await expect(
            checkAssets(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should require no approvals for assets with their EIP", async () => {
        await expect(
            checkAssets(fakeOctokit, { erc: ["a", "b", "c"] }, [
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
                {
                    filename: "content/00001/assets/foo.md",
                    status: "modified",
                    previous_contents: "# Heading\n",
                    contents: "# New Heading\n",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should need no approvals for assets with their EIP (index.md)", async () => {
        await expect(
            checkAssets(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00001/index.md",
                    status: "modified",
                    previous_contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    contents:
                        "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!",
                    source_remote,
                    target_remote,
                },
                {
                    filename: "content/00001/assets/foo.md",
                    status: "modified",
                    previous_contents: "# Heading\n",
                    contents: "# New Heading\n",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([]);
    });

    test("Should need approvals for assets without their EIP", async () => {
        await expect(
            checkAssets(fakeOctokit, { erc: ["a", "b", "c"] }, [
                {
                    filename: "content/00005/assets/foo.md",
                    status: "modified",
                    previous_contents: "# Heading\n",
                    contents: "# New Heading\n",
                    source_remote,
                    target_remote,
                },
            ]),
        ).resolves.toMatchObject([
            {
                name: "authors",
                reviewers: ["foo"],
            },
        ]);
    });
});
