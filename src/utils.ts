import { cleanCodeBlockContent, codeBlock as rawCodeBlock } from "discord.js";
import Command from "./commands.ts";
import evalCommand from "./commands/eval.ts";

const commandArray: [Command] = [evalCommand];
export const commands = new Map(commandArray.map((c) => [c.name, c]));
export let prefix = "b";

/**
 * Sanitizes and formats code into a Markdown code block
 * @param code Code that will be formatted
 * @param lang Language code for syntax highlighting
 * @returns Markdown-formatted code block
 */
export function codeBlock(code: string, lang = ""): string {
    const sanitizedCode = cleanCodeBlockContent(code);
    return rawCodeBlock(lang, sanitizedCode);
}

export const whitespace = /\s+/;

export function getArgs(mainContent: string): string[] {
    return mainContent.trim().split(whitespace);
}
