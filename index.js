import {Client, Intents, MessageEmbed} from "discord.js";
import shlex from "shlex";
import fetch from "node-fetch";
import {DateTime} from "luxon";

import * as child from "child_process";
import * as util from "util"

import config from "./config.json" assert { type: "json" };

import 'dotenv/config';

const mkId = () => Array(8).fill(null).map(_=>Math.floor(Math.random()*255).toString(16)).join("");

const ping = async (host) => {
    let pingResult;
    try {
        pingResult = await util.promisify(child.execFile)("ping", ["-c", "1", "-w", "2", host]);
    } catch (e) {
        return {host: host, online: false, rttAvg: Infinity, stdout: e.stdout.trim(), code: e.code};
    }
    return {
        host: host,
        online: true,
        rttAvg: parseFloat(pingResult.stdout.trim().split("\n").at(-1).match(/[0-9\.]+\//g)[1].slice(0, -1)),
        stdout: pingResult.stdout,
        code: 0
    };
}

if (!process.env.TOKEN) {
    console.error("error: TOKEN environment variable missing");
    process.exit(1);
}

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on("messageCreate", async message => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;
    console.debug(`<${message.author.username}#${message.author.discriminator}/${message.author.id}> ${message.content}`);

    let args;
    try { args = shlex.split(message.content.substring(config.prefix.length)); }
    catch (e) { console.error("formatting error: ", e); return; }

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
                    "- `%status [--raw || --verbose || -v]`: get blurryCast status:\n" +
                    "  * `--raw` sends raw json as received from the server) \n" +
                    "  * `-v` || `--verbose` displays more info (ignored with `--raw`)\n" +
                    "- `%ping` displays ping times to the icecast server and other services"
                );
                break;
            case "ping":
                const hosts = [
                    config.icecast_server.replace(/^https{0,1}:\/\//, "").replace(/:{0,1}[0-9]*$/, "")
                ].concat(config.ping_hosts);
                const statsMsg = await message.channel.send("pinging hosts...");
                const roundtrip = statsMsg.createdTimestamp - message.createdTimestamp;
                const statuses = await Promise.all(hosts.map(async (host, i) => {
                    await statsMsg.edit(`pinging hosts... [${i+1}/${hosts.length}]`);
                    return await ping(host);
                }));
                await statsMsg.edit("building embed...");
                //await statsMsg.edit(JSON.stringify(statuses, null, 2));
                const statsEmbed = new MessageEmbed()
                    .setTitle("ping times")
                    .addField(`message roundtrip: ${roundtrip}ms`, `websocket heartbeat: ${client.ws.ping}ms`, false);

                statuses.forEach(s => statsEmbed.addField(
                    `\`${s.host}\`: ${s.online ? s.rttAvg.toString()+"ms" : "OFFLINE"}`,
                    "```\n" + (s.online ? s.stdout.split("\n").slice(0, 2).join("\n") : s.stdout) + "\n```",
                    false
                ));

                await statsMsg.edit("done!");
                await statsMsg.edit({embeds: [statsEmbed]});
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

                const verbose = args.includes("-v") || args.includes("--verbose");

                const embed = new MessageEmbed()
                    .setColor("#515151")
                    .setAuthor({name: config.icecast_server})
                    .setTimestamp();

                if (data.source) {
                    data.source.mountpoint = data.source.listenurl.slice(data.source.listenurl.lastIndexOf("/"));
                    const streamDuration = DateTime.now().diff(DateTime.fromISO(data.source.stream_start_iso8601), ["seconds", "minutes", "hours", "days"]);
                    embed
                        .setColor("#4cd377")
                        .setTitle(data.source.mountpoint)
                        .setURL(`${config.icecast_server}${data.source.mountpoint}`)
                        .setDescription(`${data.source.title || "no description"}\ngenre: ${data.source.genre}`)
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
                            },
                            {
                                name: `streaming for ${streamDuration.toHuman({maximumFractionDigits: 0, unitDisplay: "short"})}`,
                                value: `started @ ${data.source.stream_start}`
                            }
                        );
                    if (verbose) embed.addFields(
                            {
                                name: `${data.source.audio_channels}ch@${data.source["ice-samplerate"] / 1000}k / ${data.source.audio_bitrate/1000}k`,
                                value: `${data.source.server_type} - ${data.source.subtype}`, inline: true
                            }
                        );
                } else {
                    embed
                        .setTitle("offline")
                        .setDescription("there are no streams currenly active.");
                }
                if (verbose || !data.source){
                    const uptime = DateTime.now().diff(DateTime.fromISO(data.server_start_iso8601), ["seconds", "minutes", "hours", "days"]);
                    embed.addFields(
                        {
                            name: data.server_id || "server id empty",
                            value: `location: ${data.location}\nadmin: ${data.admin}`,
                            inline: true
                        },
                        {
                            name: `uptime: ${uptime.toHuman({maximumFractionDigits: 0, unitDisplay: "short"})}`,
                            value: `started @ ${data.server_start}`,
                            inline: true
                        }
                    );
                }

                await msg.edit("done!");
                await msg.edit({embeds: [embed]});
                break;
        }
    } catch (e) {
        const errid = mkId();
        console.log(`errid: ${errid}`);
        console.error(e);
        message.channel.send(`:warning: error!\n\`errid=${errid} command="${command}" args=${JSON.stringify(args)}\`\n\`${e}\``)
            .catch(e => console.error("could not send error message:", e));
    }
});

const commitId = (await util.promisify(child.exec)("git rev-parse --short HEAD")).stdout.trim();
console.log(`running commit ${commitId}`);

client.once("ready", () => {
    console.log(`logged in as ${client.user.username}#${client.user.discriminator}`);
    client.user.setPresence({activities: [{name: `commit ${commitId} @ ${config.repo_link}`}], status: "idle"});
});

client.login(process.env.TOKEN);
