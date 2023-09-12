#!/usr/bin/env bun

import {
    ApplicationCommandData,
    ApplicationCommandDataResolvable,
    Client,
    Events,
    GatewayIntentBits,
    Partials,
} from "discord.js";
import { codeBlock, commands, prefix, whitespace } from "./utils.ts";
import truncate from "truncate-utf8-bytes";
import { Headers, fetch } from "undici";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
    rest: {
        api: process.env.DISCORD_HTTP,

        makeRequest(request, opts) {
            const headers = new Headers(opts.headers);
            headers.delete("Authorization");
            opts.headers = headers;
            return fetch(request, opts);
        },
    },
});

client.once(Events.ClientReady, async (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.partial) await message.fetch();
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const content = message.content.slice(prefix.length);
    const commandSeparatorIndex = whitespace.exec(content)?.index;
    if (!commandSeparatorIndex) return;
    const commandName = content.slice(0, commandSeparatorIndex);
    const command = commands.get(commandName);
    if (!command) return;

    const mainContent = content.slice(commandSeparatorIndex + 1);

    try {
        await command.run({ client, message, mainContent });
    } catch (error) {
        console.error(error);
        let asString = truncate(String(error), 1500);
        await message.reply(`Error: ${codeBlock(asString, "js")}`);
    }
});

client.on(Events.Error, console.error);
client.on(Events.Warn, console.warn);
// client.on(Events.Debug, console.debug);
// client.on(Events.Raw, console.debug);

async function stop() {
    console.error("Stopping");
    await client.destroy();
    process.exit(0);
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
process.once("SIGHUP", stop);

await client.login();
