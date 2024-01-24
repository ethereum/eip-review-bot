import { File } from "./types";

export const RE_PROPOSAL = /^content\/([0-9]+)(?:\/index)?.md$/;
export const RE_ASSET = /^content\/([0-9]+)\/assets\/.*$/;
export const RE_STATIC = /^static\/.*$/;
export const RE_TEMPLATE = /^templates\/.*$/;
export const RE_THEME = /^themes\/.*$/;
export const RE_CONFIG = /^\.wg\/.*$/;

function testFile(re: RegExp, arg: string | File): boolean {
    if (typeof arg !== "string") {
        arg = arg.filename;
    }

    return re.test(arg);
}

export function isProposal(arg: string | File): boolean {
    return testFile(RE_PROPOSAL, arg);
}

export function isAsset(arg: string | File): boolean {
    return testFile(RE_ASSET, arg);
}

export function isStatic(arg: string | File): boolean {
    return testFile(RE_STATIC, arg);
}

export function isTemplate(arg: string | File): boolean {
    return testFile(RE_TEMPLATE, arg);
}

export function isTheme(arg: string | File): boolean {
    return testFile(RE_THEME, arg);
}

export function isConfig(arg: string | File): boolean {
    return testFile(RE_CONFIG, arg);
}

export function eipNumber(arg: string | File): number {
    if (typeof arg !== "string") {
        arg = arg.filename;
    }

    const match = arg.match(RE_PROPOSAL);
    if (!match) {
        throw new Error(`given path was not a proposal: '${arg}'`);
    }

    const result = Number.parseInt(match[1]);
    if (!Number.isInteger(result)) {
        throw new Error(`given path did not contain an integer: '${arg}'`);
    }

    return result;
}
