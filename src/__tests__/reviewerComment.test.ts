import {
    FileRuleCommentData,
    generateReviewerComment,
} from "../reviewerComment";

describe("generateReviewerComment", () => {
    it("wraps editor reviewers in backticks to suppress pings", () => {
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "editors",
                    min: 2,
                    requesting: ["lightclient", "samwilsn", "g11tech"],
                    mention_reviewers: false,
                },
            ],
        };

        const comment = generateReviewerComment(filesToRules);
        expect(comment).toContain(
            "Requires 2 more reviews from **Editors**: `@g11tech`, `@lightclient`, `@samwilsn`",
        );
    });

    it("keeps real @mentions for author reviewers", () => {
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "authors",
                    min: 1,
                    requesting: ["vitalik"],
                    mention_reviewers: true,
                },
                {
                    name: "editors",
                    min: 2,
                    requesting: ["lightclient", "samwilsn", "g11tech"],
                    mention_reviewers: false,
                },
            ],
        };

        const comment = generateReviewerComment(filesToRules);
        expect(comment).toContain(
            "Requires 1 more review from **Authors**: @vitalik",
        );
        expect(comment).toContain(
            "Requires 2 more reviews from **Editors**: `@g11tech`, `@lightclient`, `@samwilsn`",
        );
    });

    it("pings an editor as an author when they authored the EIP", () => {
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "authors",
                    min: 1,
                    requesting: ["samwilsn"],
                    mention_reviewers: true,
                },
                {
                    name: "editors",
                    min: 2,
                    requesting: ["lightclient", "samwilsn", "g11tech"],
                    mention_reviewers: false,
                },
            ],
        };

        const comment = generateReviewerComment(filesToRules);
        expect(comment).toContain(
            "Requires 1 more review from **Authors**: @samwilsn",
        );
        expect(comment).toContain(
            "Requires 2 more reviews from **Editors**: `@g11tech`, `@lightclient`, `@samwilsn`",
        );
    });

    it("dedupes rules with the same name and reviewers", () => {
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "editors",
                    min: 1,
                    requesting: ["bob", "alice"],
                    mention_reviewers: false,
                },
                {
                    name: "editors",
                    min: 2,
                    requesting: ["alice", "bob"],
                    mention_reviewers: false,
                },
            ],
        };

        const comment = generateReviewerComment(filesToRules);
        expect(comment.match(/Requires/g)?.length).toBe(1);
        expect(comment).toContain(
            "Requires 1 more review from **Editors**: `@alice`, `@bob`",
        );
    });

    it("dedupes editor rules with the same reviewers even when rule names differ", () => {
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "new",
                    min: 1,
                    requesting: ["samwilsn"],
                    mention_reviewers: false,
                },
                {
                    name: "statuschange",
                    min: 1,
                    requesting: ["samwilsn"],
                    mention_reviewers: false,
                },
            ],
        };

        const comment = generateReviewerComment(filesToRules);
        expect(comment.match(/Requires/g)?.length).toBe(1);
        expect(comment).toContain(
            "Requires 1 more review from **Editors**: `@samwilsn`",
        );
    });

    it("keeps authors and editors separate even with the same reviewers", () => {
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "authors",
                    min: 1,
                    requesting: ["samwilsn"],
                    mention_reviewers: true,
                },
                {
                    name: "editors",
                    min: 1,
                    requesting: ["samwilsn"],
                    mention_reviewers: false,
                },
            ],
        };

        const comment = generateReviewerComment(filesToRules);
        expect(comment.match(/Requires/g)?.length).toBe(2);
        expect(comment).toContain("**Authors**");
        expect(comment).toContain("**Editors**");
    });

    it("does not mutate requesting reviewer arrays", () => {
        const requesting = ["bob", "alice"];
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "editors",
                    min: 1,
                    requesting,
                    mention_reviewers: false,
                },
            ],
        };

        generateReviewerComment(filesToRules);
        expect(requesting).toEqual(["bob", "alice"]);
    });

    it("collapses duplicate reviewer sets and prefers ping format", () => {
        const filesToRules: { [key: string]: FileRuleCommentData[] } = {
            "EIPS/eip-1.md": [
                {
                    name: "authors",
                    min: 1,
                    requesting: ["samwilsn"],
                    mention_reviewers: false,
                },
                {
                    name: "authors",
                    min: 1,
                    requesting: ["samwilsn"],
                    mention_reviewers: true,
                },
            ],
        };

        const comment = generateReviewerComment(filesToRules);
        expect(comment.match(/Requires/g)?.length).toBe(1);
        expect(comment).toContain(
            "Requires 1 more review from **Authors**: @samwilsn",
        );
        expect(comment).not.toContain("`@samwilsn`");
    });
});
