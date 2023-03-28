import type { File } from "../types";
import { mockOctokit, mockEIPsRepo } from "./generateMockOctokit";
import { generatePRTitle } from "../namePr";
import localConfig from "../localConfig";

describe("namePR", () => {
    it("Correctly Names Simulated PR-1: Modifies EIP-1", async () => {
        let files = [{
            filename: "EIPS/eip-1.md",
            status: "modified",
            contents: "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing1",
            previous_contents: "---\ntitle: EIP Rules And Guidelines\nstatus: Living\n---\n## Testing2"
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 1, files);
        expect(prTitle).toEqual(`${localConfig.title.updateEipPrefix.replace("XXXX", "1")}PR Title Testing 123 (EIP-1)`);
    });
    it("Correctly Names Simulated PR-2: Modifies CI", async () => {
        let files = [{
            filename: ".github/workflows/testing.yml",
            status: "modified",
            contents: "ci: old",
            previous_contents: "ci: new"
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 2, files);
        expect(prTitle).toEqual(`${localConfig.title.ciPrefix}PR Title Testing 123 (.github/workflows)`);
    });
    it("Correctly Names Simulated PR-3: Modifies config", async () => {
        let files = [{
            filename: "config/testing.yml",
            status: "modified",
            contents: "config: old",
            previous_contents: "config: new"
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 3, files);
        expect(prTitle).toEqual(`${localConfig.title.configPrefix}PR Title Testing 123 (config)`);
    });
    it("Correctly Names Simulated PR-4: Modifies .github", async () => {
        let files = [{
            filename: ".github/testing.yml",
            status: "modified",
            contents: "github: old",
            previous_contents: "github: new"
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 4, files);
        expect(prTitle).toEqual(`${localConfig.title.configPrefix}PR Title Testing 123 (.github)`);
    });
    it("Correctly Names Simulated PR-5: Modifies EIP Template", async () => {
        let files = [{
            filename: "eip-template.md",
            status: "modified",
            contents: "---\ntitle: EIP Template\n---\n## Testing1",
            previous_contents: "---\ntitle: EIP Template\n---\n## Testing2",
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 5, files);
        expect(prTitle).toEqual(`${localConfig.title.updateEipPrefix.replace("EIP-XXXX", "Template")}PR Title Testing 123 (EIP Template)`);
    });
    it("Correctly Names Simulated PR-6: Modifies EIP README", async () => {
        let files = [{
            filename: "README.md",
            status: "modified",
            contents: "## Testing1",
            previous_contents: "## Testing2",
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 6, files);
        expect(prTitle).toEqual(`${localConfig.title.updateEipPrefix.replace("EIP-XXXX", "README")}PR Title Testing 123 (EIP README)`);
    });
    it("Correctly Names Simulated PR-7: Adds New EIP", async () => {
        let files = [{
            filename: "EIPS/eip-9999.md",
            status: "added",
            contents: "---\ntitle: Testing New EIP\n---\n## Testing1",
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 7, files);
        expect(prTitle).toEqual(`${localConfig.title.addEipPrefix}Testing New EIP`);
    });
    it("Correctly Names Simulated PR-8: Updates EIP Status", async () => {
        let files = [{
            filename: "EIPS/eip-9999.md",
            status: "modified",
            contents: "---\ntitle: Testing New EIP\nstatus: Final\n---\n## Testing1",
            previous_contents: "---\ntitle: Testing New EIP\nstatus: Living\n---\n## Testing2",
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 8, files);
        expect(prTitle).toEqual(`${localConfig.title.updateEipPrefix.replace("XXXX", "9999")}PR Title Testing 123 (Status Change EIP-9999)`);
    });
    it("Correctly Names Simulated PR-9: Updates Existing EIP", async () => {
        let files = [{
            filename: "EIPS/eip-9999.md",
            status: "modified",
            contents: "---\ntitle: Testing New EIP\n---\n## Testing1",
            previous_contents: "---\ntitle: Testing New EIP\n---\n## Testing2",
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 9, files);
        expect(prTitle).toEqual(`${localConfig.title.updateEipPrefix.replace("XXXX", "9999")}PR Title Testing 123 (Update EIP-9999)`);
    });
    it("Correctly Names Simulated PR-12: Modifies Website", async () => {
        let files = [{
            filename: "index.html",
            status: "modified",
            contents: "## Testing1",
            previous_contents: "## Testing2",
        }] as File[];
        const prTitle = await generatePRTitle(mockOctokit, {} as any, mockEIPsRepo, 12, files);
        expect(prTitle).toEqual(`${localConfig.title.websitePrefix}PR Title Testing 123 (Update Website)`);
    });
});
