import { Octokit } from "../../types";
import checkOtherFiles from "../unknown";

const fakeOctokit = null as unknown as Octokit; // Ew, but it works

describe("checkOtherFiles", () => {
    test("Should require half of governance editors on unknown file", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { governance: ["a", "b", "c"] }, [
                { filename: "foo.txt", status: "modified" },
            ]),
        ).resolves.toMatchObject([
            {
                name: "unknown",
                reviewers: ["a", "b", "c"],
                min: 1,
                annotation: {
                    file: "foo.txt",
                },
            },
        ]);
    });

    test("Should not require any reviewers on known file", async () => {
        await expect(
            checkOtherFiles(fakeOctokit, { governance: ["a", "b", "c"] }, [
                { filename: "EIPS/eip-asdf.md", status: "modified" },
            ]),
        ).resolves.toMatchObject([]);
    });
});
