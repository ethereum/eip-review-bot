export type FileRuleCommentData = {
    name: string;
    min: number;
    requesting: string[];
    mention_reviewers: boolean;
};

function getRuleRole(name: string): "authors" | "editors" {
    return name === "authors" ? "authors" : "editors";
}

function buildRuleKey(role: string, requesting: string[]): string {
    return `${role}:${requesting.join(",")}`;
}

function formatRoleName(role: "authors" | "editors"): string {
    return role === "authors" ? "Authors" : "Editors";
}

function formatReviewer(username: string, mention_reviewers: boolean): string {
    return mention_reviewers ? `@${username}` : `\`@${username}\``;
}

function summarizeRules(
    fileRules: FileRuleCommentData[],
): FileRuleCommentData[] {
    const byRule = new Map<string, FileRuleCommentData>();
    for (const rule of fileRules) {
        const requesting = [...rule.requesting].sort();
        const role = getRuleRole(rule.name);
        const key = buildRuleKey(role, requesting);
        const existing = byRule.get(key);
        if (existing) {
            existing.mention_reviewers =
                existing.mention_reviewers || rule.mention_reviewers;
            continue;
        }
        byRule.set(key, {
            name: role,
            min: rule.min,
            requesting,
            mention_reviewers: rule.mention_reviewers,
        });
    }
    return Array.from(byRule.values());
}

export function generateReviewerComment(
    filesToRules: Record<string, FileRuleCommentData[]>,
): string {
    let comment = "";
    for (const [file, rules] of Object.entries(filesToRules)) {
        comment = `${comment}\n\n### File \`${file}\`\n\n`;
        for (const rule of summarizeRules(rules)) {
            comment = `${comment}Requires ${rule.min} more ${rule.min === 1 ? "review" : "reviews"} from **${formatRoleName(getRuleRole(rule.name))}**: ${rule.requesting
                .map((r) => formatReviewer(r, rule.mention_reviewers))
                .join(", ")}\n`;
        }
    }
    return comment;
}
