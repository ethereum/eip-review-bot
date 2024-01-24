import localConfig from "../localConfig";
import { generatePRTitle } from "../namePr";
import { PullRequest, User } from "@octokit/webhooks-types";

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

describe("namePR", () => {
    it("Correctly Names Simulated PR-1: Modifies EIP-1", () => {
        const files = [
            {
                filename: "content/00001.md",
                status: "modified",
                contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
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
                target_remote,
                source_remote,
            } as const,
        ];
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
                filename: ".wg/testing.yml",
                status: "modified",
                contents: "config: old",
                previous_contents: "config: new",
                source_remote,
                target_remote,
            } as const,
        ];
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
                target_remote,
                source_remote,
            } as const,
        ];
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
                filename: "docs/template.md",
                status: "modified",
                contents: "---\ntitle: EIP Template\n---\n## Testing1",
                previous_contents: "---\ntitle: EIP Template\n---\n## Testing2",
                target_remote,
                source_remote,
            } as const,
        ];
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
                target_remote,
                source_remote,
            } as const,
        ];
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
                filename: "content/09999.md",
                status: "added",
                contents: "---\ntitle: Testing New EIP\n---\n## Testing1",
                target_remote,
                source_remote,
            } as const,
        ];
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
                filename: "content/09999.md",
                status: "modified",
                contents:
                    "---\ntitle: Testing New EIP\nstatus: Final\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New EIP\nstatus: Living\n---\n## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
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
                filename: "content/09999.md",
                status: "modified",
                contents: "---\ntitle: Testing New EIP\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New EIP\n---\n## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
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
                filename: "static/assets/css/foo.css",
                status: "modified",
                contents: "## Testing1",
                previous_contents: "## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
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

    it("Correctly Names Simulated PR-13: Modifies index.md", () => {
        const files = [
            {
                filename: "content/00001/index.md",
                status: "modified",
                contents:
                    "---\ntitle: ERC Rules And Guidelines\nstatus: Living\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: ERC Rules And Guidelines\nstatus: Living\n---\n## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (index.md)",
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
            )}PR Title Testing 123 (index.md)`,
        );
    });

    it("Correctly Names Simulated PR-15: Adds New index.md", () => {
        const files = [
            {
                filename: "content/09999/index.md",
                status: "added",
                contents: "---\ntitle: Testing New ERC\n---\n## Testing1",
                source_remote,
                target_remote,
            } as const,
        ];
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
            `${localConfig.title.addEipPrefix}Testing New ERC`,
        );
    });

    it("Correctly Names Simulated PR-16: Updates index.md Status", () => {
        const files = [
            {
                filename: "content/09999/index.md",
                status: "modified",
                contents:
                    "---\ntitle: Testing New ERC\nstatus: Final\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New ERC\nstatus: Living\n---\n## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
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
            `${localConfig.title.updateEipPrefix.replace(
                "XXXX",
                "9999",
            )}Move to Final`,
        );
    });

    it("Correctly Names Simulated PR-17: Updates Existing index.md", () => {
        const files = [
            {
                filename: "content/09999/index.md",
                status: "modified",
                contents: "---\ntitle: Testing New ERC\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: Testing New ERC\n---\n## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
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
            `${localConfig.title.updateEipPrefix.replace(
                "XXXX",
                "9999",
            )}PR Title Testing 123 (Update ERC-9999)`,
        );
    });

    it("Correctly Names Simulated PR-18: Modifies index.md", () => {
        const files = [
            {
                filename: "content/00001/index.md",
                status: "modified",
                contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing1",
                previous_contents:
                    "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing2",
                source_remote,
                target_remote,
            } as const,
        ];
        const prTitle = generatePRTitle(
            {
                title: "PR Title Testing 123 (index.md)",
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
            )}PR Title Testing 123 (index.md)`,
        );
    });
});
