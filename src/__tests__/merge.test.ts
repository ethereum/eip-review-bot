import { generateEIPNumber } from "../merge";

describe("generateEIPNumber", () => {
    it("should generate a draft EIP number for a new draft", async () => {
        const mockOctokit = {
            rest: {
                repos: {
                    getContent: jest.fn().mockResolvedValue({
                        data: [{ name: "eip-1.md" }, { name: "eip-2.md" }],
                    }),
                },
            },
        };
        const mockRepository = { owner: { login: "ethereum" } };
        const mockFrontmatter = { status: "Draft", title: "Test EIP" };
        const mockFile = { status: "added" };

        const result = await generateEIPNumber(
            mockOctokit as any,
            mockRepository as any,
            mockFrontmatter as any,
            mockFile as any,
            false,
        );

        expect(result).toBe("draft_test_eip");
    });
});
