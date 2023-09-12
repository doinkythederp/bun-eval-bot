import { inspect } from "bun";
import Command from "../commands.ts";
import { codeBlock, getArgs } from "../utils.ts";
import * as utils from "../utils.ts";
import { Option, None, Some, Result, Ok, Err, unwrap } from "optionals/mod.ts";
import { transformAsync } from "@babel/core";
import { RawSourceMap } from "source-map";
import { Client, Message } from "discord.js";
import truncate from "truncate-utf8-bytes";

/**
 * Extract the code to run from a code block
 */
function parseCommand(mainContent: string) {
    const codeMarkers = Array.from(mainContent.matchAll(/```/g));
    if (codeMarkers.length < 2) {
        return { code: mainContent, flags: None<string[]>() };
    }

    const firstFlags = mainContent.slice(0, unwrap(codeMarkers[0]?.index));
    let code = mainContent
        .slice(unwrap(codeMarkers[0].index) + 3, unwrap(codeMarkers[1].index))
        .replace(/^(?:ts|typescript|js|javascript)\n/, "");
    const lastFlags = mainContent.slice(unwrap(codeMarkers[1].index) + 3);
    const flags = getArgs(`${firstFlags} ${lastFlags}`);

    return { code, flags: Some(flags) };
}

async function compile(
    code: string,
): Promise<Result<{ code: string; map: RawSourceMap }, Error>> {
    const compiled = await Result.fromAsync(() =>
        transformAsync(`export default async do {\n${code}\n};`, {
            filename: "<eval>.ts",
            sourceMaps: true,
            babelrc: false,
            configFile: false,
            parserOpts: {
                allowImportExportEverywhere: true,
                strictMode: false,
                attachComment: false,
            },
            plugins: [
                [
                    "@babel/plugin-transform-modules-commonjs",
                    {
                        strict: true,
                        strictMode: false,
                    },
                ],
                "@babel/plugin-proposal-do-expressions",
                "@babel/plugin-proposal-async-do-expressions",
                "@babel/plugin-proposal-throw-expressions",
                "@babel/plugin-transform-typescript",
            ],
        }),
    );
    return compiled.andThen((output) => {
        if (!output) return Err(new Error("Compile failed"));
        return Ok({
            code: unwrap(output.code),
            map: unwrap(output.map),
        });
    });
}

export default {
    name: "eval",
    description: "Evaluate TypeScript code",
    async run({ message, mainContent }) {
        const { code, flags } = parseCommand(mainContent);
        console.log("eval>", code, flags);
        const compiled = await compile(code);
        if (compiled.isErr()) {
            await message.reply(
                `Error: ${codeBlock(compiled.unwrapErr().message, "ansi")}`,
            );
            return;
        }
        const { code: js, map } = compiled.unwrap();
        const callable = new Function(
            "require",
            "__dirname",
            "__filename",
            "client",
            "code",
            "message",
            "utils",
            `var exports = {}; { ${js} }; return exports;`,
        ) as (
            require: NodeRequire,
            __dirname: string,
            __filename: string,
            client: Client,
            code: string,
            message: Message,
            utils: typeof import("../utils.ts"),
        ) => { default: unknown };

        let result: unknown;
        let errored = false;
        try {
            result = await callable(
                require,
                __dirname,
                __filename,
                message.client,
                code,
                message,
                utils,
            ).default;
        } catch (err) {
            errored = true;
            result = err;
        }
        const resultString = truncate(inspect(result, { colors: true }), 1950);

        await message.reply(codeBlock(resultString, "ansi"));
    },
} satisfies Command;
