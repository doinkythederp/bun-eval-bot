import { Client, Message } from "discord.js";

export type CommandOptions = {
    mainContent: string;
    client: Client<true>;
    message: Message;
};

export default interface Command {
    readonly name: string;
    readonly description: string;
    run: (options: CommandOptions) => Promise<void>;
}
