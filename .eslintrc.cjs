module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:@typescript-eslint/strict",
        "prettier",
    ],
    rules: {
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { argsIgnorePattern: "^_" },
        ],
    },
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    root: true,
    parserOptions: {
        project: true,
    },

    overrides: [
        {
            files: ["src/__tests__/**", "src/rules/__tests__/**"],
            rules: {
                "@typescript-eslint/no-unsafe-assignment": ["off"],
                "@typescript-eslint/no-unsafe-call": ["off"],
                "@typescript-eslint/no-unsafe-member-access": ["off"],
            },
        },
    ],
};
