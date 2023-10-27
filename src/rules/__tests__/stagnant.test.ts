import { Octokit } from "../../types";
import checkStagnant from "../stagnant";

let fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkStagnant", () => {
    test("Should require one reviewer on EIP resurrection", () => {
        expect(checkStagnant(fakeOctokit, { erc: ["a", "b", "c", "d"] }, [{ filename: "EIPS/eip-1.md", status: "modified", previous_contents: "---\nstatus: Stagnant\ncategory: ERC\n---\nHello!", contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!" }])).resolves.toMatchObject([{
            name: "stagnant",
            reviewers: ["a", "b", "c", "d"],
            min: 1,
            annotation: {
                file: "EIPS/eip-1.md"
            }
        }]);
    });

    test("Should not require any reviewers on EIP file with irrelevant status", () => {
        expect(checkStagnant(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "EIPS/eip-1.md", status: "modified", previous_contents: "---\nstatus: Final\ncategory: ERC\n---\nHello!", contents: "---\nstatus: Last Call\ncategory: ERC\n---\nHello!" }])).resolves.toMatchObject([]);
    });

    test("Should require one reviewer on ERC resurrection", () => {
        expect(checkStagnant(fakeOctokit, { erc: ["a", "b", "c", "d"] }, [{ filename: "ERCS/erc-1.md", status: "modified", previous_contents: "---\nstatus: Stagnant\ncategory: ERC\n---\nHello!", contents: "---\nstatus: Draft\ncategory: ERC\n---\nHello!" }])).resolves.toMatchObject([{
            name: "stagnant",
            reviewers: ["a", "b", "c", "d"],
            min: 1,
            annotation: {
                file: "ERCS/erc-1.md"
            }
        }]);
    });

    test("Should not require any reviewers on ERC file with irrelevant status", () => {
        expect(checkStagnant(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "ERCS/erc-1.md", status: "modified", previous_contents: "---\nstatus: Final\ncategory: ERC\n---\nHello!", contents: "---\nstatus: Last Call\ncategory: ERC\n---\nHello!" }])).resolves.toMatchObject([]);
    });

    test("Should not require any reviewers on non-EIP file", () => {
        expect(checkStagnant(fakeOctokit, { erc: ["a", "b", "c"] }, [{ filename: "hello.txt", status: "modified", previous_contents: "Hello!", contents: "Hello!" }])).resolves.toMatchObject([]);
    });
});
