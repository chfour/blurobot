import {Client, Intents} from "discord.js";
import shlex from "shlex";
import fetch from "node-fetch";

import config from "./config.json" assert { type: "json" };

import 'dotenv/config';

if (!process.env.TOKEN) {
    console.error("error: TOKEN environment variable missing");
    process.exit(1);
}

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on("messageCreate", async message => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;
    console.debug(`<${message.author.username}#${message.author.discriminator}/${message.author.id}> ${message.content}`);
    const args = shlex.split(message.content.substring(config.prefix.length));
    console.debug(args);

    switch (args.shift()) {
        case "test":
            await message.channel.send("alive\n`args=" + JSON.stringify(args) + "`");
            break;
        case "status":
            const msg = await message.channel.send("fetching status...");
            const response = await fetch(config.icecast_server + "/status-json.xsl");
            await msg.edit("parsing json...");
            const data = (await response.json())["icestats"];
            await msg.edit("```json\n" + JSON.stringify(data, null, 2) + "```");
            break;
    }
});

client.once("ready", () => {
	console.log(`logged in as ${client.user.username}#${client.user.discriminator}`);
});

client.login(process.env.TOKEN);
