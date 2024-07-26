export default {
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.+(spec|test)\\.(ts|tsx|js)"],
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    preset: 'ts-jest',
    testEnvironment: 'node',
};
