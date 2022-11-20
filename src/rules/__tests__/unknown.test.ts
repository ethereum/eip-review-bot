import { Octokit } from "../../types";
import checkOtherFiles from "../unknown";

let fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkOtherFiles", () => {
    test("Should require half of all editors on unknown file", () => {
        expect(checkOtherFiles(fakeOctokit, { all: ["a", "b", "c"] }, [{ filename: "foo.txt", status: "modified" }])).resolves.toMatchObject([{
            name: "unknown",
            reviewers: ["a", "b", "c"],
            min: 1,
            annotation: {
                file: "foo.txt"
            }
        }]);
    });

    test("Should not require any reviewers on known file", () => {
        expect(checkOtherFiles(fakeOctokit, { all: ["a", "b", "c"] }, [{ filename: "EIPS/foo.txt", status: "modified" }])).resolves.toMatchObject([]);
    });
});
