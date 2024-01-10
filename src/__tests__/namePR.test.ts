import localConfig from "../localConfig";
import { generatePRTitle } from "../namePr";
import type { File } from "../types";
import { PullRequest, User } from "@octokit/webhooks-types";

describe("namePR", () => {
    it("Correctly Names Simulated PR-1: Modifies EIP-1", () => {
        const files = [
            {
                filename: "EIPS/eip-1.md",
                status: "modified",
                contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (EIP-1)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix.replace(
                "XXXX",
                "1",
            )}PR Title Testing 123 (EIP-1)`,
        );
    });

    it("Correctly Names Simulated PR-2: Modifies CI", () => {
        const files = [
            {
                filename: ".github/workflows/testing.yml",
                status: "modified",
                contents: "ci: old",
                previous_contents: "ci: new",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (.github/workflows)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.ciPrefix}PR Title Testing 123 (.github/workflows)`,
        );
    });

    it("Correctly Names Simulated PR-3: Modifies config", () => {
        const files = [
            {
                filename: "config/testing.yml",
                status: "modified",
                contents: "config: old",
                previous_contents: "config: new",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (config)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.configPrefix}PR Title Testing 123 (config)`,
        );
    });

    it("Correctly Names Simulated PR-4: Modifies .github", () => {
        const files = [
            {
                filename: ".github/testing.yml",
                status: "modified",
                contents: "github: old",
                previous_contents: "github: new",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (.github)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.configPrefix}PR Title Testing 123 (.github)`,
        );
    });

    it("Correctly Names Simulated PR-5: Modifies EIP Template", () => {
        const files = [
            {
                filename: "eip-template.md",
                status: "modified",
                contents: "---\ntitle: EIP Template\n---\n## Testing1",
                previous_contents: "---\ntitle: EIP Template\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (EIP Template)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix.replace(
                "EIP-XXXX",
                "Template",
            )}PR Title Testing 123 (EIP Template)`,
        );
    });

    it("Correctly Names Simulated PR-6: Modifies EIP README", () => {
        const files = [
            {
                filename: "README.md",
                status: "modified",
                contents: "## Testing1",
                previous_contents: "## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (EIP README)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix.replace(
                "EIP-XXXX",
                "README",
            )}PR Title Testing 123 (EIP README)`,
        );
    });

    it("Correctly Names Simulated PR-7: Adds New EIP", () => {
        const files = [
            {
                filename: "EIPS/eip-9999.md",
                status: "added",
                contents: "---\ntitle: Testing New EIP\n---\n## Testing1",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (EIP README)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.addEipPrefix}Testing New EIP`,
        );
    });

    it("Correctly Names Simulated PR-8: Updates EIP Status", () => {
        const files = [
            {
                filename: "EIPS/eip-9999.md",
                status: "modified",
                contents:
                    "---\ntitle: Testing New EIP\nstatus: Final\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New EIP\nstatus: Living\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (Status Change EIP-9999)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix.replace(
                "XXXX",
                "9999",
            )}Move to Final`,
        );
    });

    it("Correctly Names Simulated PR-9: Updates Existing EIP", () => {
        const files = [
            {
                filename: "EIPS/eip-9999.md",
                status: "modified",
                contents: "---\ntitle: Testing New EIP\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New EIP\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (Update EIP-9999)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix.replace(
                "XXXX",
                "9999",
            )}PR Title Testing 123 (Update EIP-9999)`,
        );
    });

    it("Correctly Names Simulated PR-12: Modifies Website", () => {
        const files = [
            {
                filename: "index.html",
                status: "modified",
                contents: "## Testing1",
                previous_contents: "## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (Update Website)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.websitePrefix}PR Title Testing 123 (Update Website)`,
        );
    });

    it("Correctly Names Simulated PR-13: Modifies ERC-1", () => {
        const files = [
            {
                filename: "ERCS/erc-1.md",
                status: "modified",
                contents:
                    "---\ntitle: ERC Rules And Guidelines\nstatus: Living\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: ERC Rules And Guidelines\nstatus: Living\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (ERC-1)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix
                .replace("EIP", "ERC")
                .replace("XXXX", "1")}PR Title Testing 123 (ERC-1)`,
        );
    });

    it("Correctly Names Simulated PR-14: Modifies ERC Template", () => {
        const files = [
            {
                filename: "erc-template.md",
                status: "modified",
                contents: "---\ntitle: ERC Template\n---\n## Testing1",
                previous_contents: "---\ntitle: ERC Template\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (ERC Template)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix.replace(
                "EIP-XXXX",
                "Template",
            )}PR Title Testing 123 (ERC Template)`,
        );
    });

    it("Correctly Names Simulated PR-15: Adds New ERC", () => {
        const files = [
            {
                filename: "ERCS/erc-9999.md",
                status: "added",
                contents: "---\ntitle: Testing New ERC\n---\n## Testing1",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (ERC README)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.addEipPrefix.replace(
                "EIP",
                "ERC",
            )}Testing New ERC`,
        );
    });

    it("Correctly Names Simulated PR-16: Updates ERC Status", () => {
        const files = [
            {
                filename: "ERCS/erc-9999.md",
                status: "modified",
                contents:
                    "---\ntitle: Testing New ERC\nstatus: Final\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New ERC\nstatus: Living\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (Status Change ERC-9999)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix
                .replace("EIP", "ERC")
                .replace("XXXX", "9999")}Move to Final`,
        );
    });

    it("Correctly Names Simulated PR-17: Updates Existing ERC", () => {
        const files = [
            {
                filename: "ERCS/erc-9999.md",
                status: "modified",
                contents: "---\ntitle: Testing New ERC\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New ERC\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (Update ERC-9999)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix
                .replace("EIP", "ERC")
                .replace(
                    "XXXX",
                    "9999",
                )}PR Title Testing 123 (Update ERC-9999)`,
        );
    });

    it("Correctly Names Simulated PR-18: Modifies ERC-1", () => {
        const files = [
            {
                filename: "ERCS/erc-1.md",
                status: "modified",
                contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing2",
            },
        ] as File[];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (ERC-1)",
                user: {
                    login: "testUser",
                } as User,
            } as PullRequest,
            files,
        );
        expect(prTitle).toEqual(
            `${localConfig.title.updateEipPrefix
                .replace("EIP", "ERC")
                .replace("XXXX", "1")}PR Title Testing 123 (ERC-1)`,
        );
    });
});
