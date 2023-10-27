import { Octokit } from "../../types";
import checkAuthors from "../authors";

let fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkAuthors", () => {
    test("Should require author approval for modified EIPs", () => {
        expect(checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "EIPS/eip-1.md", status: "modified", previous_contents: "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!", contents: "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!" }])).resolves.toMatchObject([{
            name: "authors",
            reviewers: ["hello", "neet"],
            min: 1,
            pr_approval: true,
            annotation: {
                file: "EIPS/eip-1.md"
            }
        }]);
    });

    test("Should not require author approval for added EIPs", () => {
        expect(checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "EIPS/eip-1.md", status: "added", contents: "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!" }])).resolves.toMatchObject([]);
    });

    test("Should not require author approval for living EIPs", () => {
        expect(checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "EIPS/eip-1.md", status: "modified", previous_contents: "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!", contents: "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!" }])).resolves.toMatchObject([]);
    });

    test("Should require author approval for modified ERCs", () => {
        expect(checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "ERCS/erc-1.md", status: "modified", previous_contents: "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!", contents: "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!" }])).resolves.toMatchObject([{
            name: "authors",
            reviewers: ["hello", "neet"],
            min: 1,
            pr_approval: true,
            annotation: {
                file: "ERCS/erc-1.md"
            }
        }]);
    });

    test("Should not require author approval for added ERCs", () => {
        expect(checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "ERCS/erc-1.md", status: "added", contents: "---\nstatus: Draft\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!" }])).resolves.toMatchObject([]);
    });

    test("Should not require author approval for living ERCs", () => {
        expect(checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "ERCS/erc-1.md", status: "modified", previous_contents: "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!", contents: "---\nstatus: Living\ncategory: ERC\nauthor: Hello World (@hello), Neet (@neet), Honk, Foo <bar@example.com>\n---\nHello!" }])).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on non-EIP file", () => {
        expect(checkAuthors(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "hello.txt", status: "modified", previous_contents: "Hello!", contents: "Hello!" }])).resolves.toMatchObject([]);
    });
});
