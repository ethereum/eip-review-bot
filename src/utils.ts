import { File } from "./types";

export const RE_PROPOSAL = /^content\/([0-9]+)(?:\/index)?.md$/;
export const RE_ASSET = /^content\/([0-9]+)\/assets\/.*$/;

export function isProposal(arg: string | File): boolean {
    if (typeof arg !== "string") {
        arg = arg.filename;
    }

    return RE_PROPOSAL.test(arg);
}

export function isAsset(arg: string | File): boolean {
    if (typeof arg !== "string") {
        arg = arg.filename;
    }

    return RE_ASSET.test(arg);
}
