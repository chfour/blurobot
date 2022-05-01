import {Client, Intents, MessageEmbed} from "discord.js";
import shlex from "shlex";
import fetch from "node-fetch";

import config from "./config.json" assert { type: "json" };

import 'dotenv/config';

const mkId = () => Array(8).fill(null).map(_=>Math.floor(Math.random()*255).toString(16)).join("");

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
    const command = args.shift();
    try {
        switch (command) {
            case "test":
                await message.channel.send("alive\n`args=" + JSON.stringify(args) + "`");
                break;
            case "throw":
                null.indexOf("");
                break;
            case "help":
                await message.channel.send(
                    "**blurobot help**\n" +
                    "- `%help`: display this\n" +
                    "- `%status [--raw]`: get blurryCast status (`--raw` sends raw json as received from the server)"
                );
                break;
            case "status":
                const msg = await message.channel.send("fetching status...");
                const response = await fetch(config.icecast_server + "/status-json.xsl");
                await msg.edit(`\`${response.status} ${response.statusText}\` - parsing json...`);
                const data = (await response.json())["icestats"];
                await msg.edit(`\`${response.status} ${response.statusText}\` - json ok - building embed...`);
                if (args.includes("--raw")) {
                    await msg.edit("```json\n" + JSON.stringify(data, null, 2) + "```");
                    break;
                }

                const embed = new MessageEmbed()
                    .setColor("#515151")
                    .setAuthor({name: config.icecast_server})
                    .setTimestamp();

                if (data.source) {
                    data.source.mountpoint = data.source.listenurl.slice(data.source.listenurl.lastIndexOf("/"))
                    embed
                        .setColor("#4cd377")
                        .setTitle(data.source.mountpoint)
                        .setURL(`${config.icecast_server}${data.source.mountpoint}`)
                        .setDescription(data.source.title || "no description")
                        .addFields(
                            {
                                name: data.source.server_name || "name empty",
                                value: data.source.server_description || "description empty",
                                inline: false
                            },
                            {
                                name: `listeners: ${data.source.listeners}`,
                                value: `peak: ${data.source.listener_peak}`,
                                inline: true
                            }
                        );
                } else {
                    embed
                        .setTitle("offline")
                        .setDescription("there are no streams currenly active.")
                        .addFields(
                            {name: data.server_id || "server id empty", value: `location: ${data.location}\nadmin: ${data.admin}`, inline: true}
                        )
                }

                await msg.edit("done!");
                await msg.edit({embeds: [embed]});
                break;
        }
    } catch (e) {
        const errid = mkId();
        console.log(`errid: ${errid}`);
        console.error(e);
        message.channel.send(`:warning: error! exception occured!\n\`errid=${errid} command="${command}" args=${JSON.stringify(args)}\`\n\`${e}\``)
            .catch(e => console.error("could not send error message:", e));
    }
});

client.once("ready", () => {
	console.log(`logged in as ${client.user.username}#${client.user.discriminator}`);
});

client.login(process.env.TOKEN);
