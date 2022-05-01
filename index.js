const { Client, Intents } = require("discord.js");
const shlex = require("shlex");
const config = require("./config.json");

require("dotenv").config();

if (!process.env.TOKEN) {
    console.error("error: TOKEN environment variable missing");
    process.exit(1);
}

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on("messageCreate", async message => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;
    console.debug(`<${message.author.username}#${message.author.discriminator}/${message.author.id}> ${message.content}`);
    const args = shlex.split(message.content.substring(config.prefix.length));
    console.debug(command);

    switch (args.shift()) {
        case "test":
            await message.channel.send("alive\n`args=" + JSON.stringify(args) + "`");
            break
    }
});

client.once("ready", () => {
	console.log(`logged in as ${client.user.username}#${client.user.discriminator}`);
});

client.login(process.env.TOKEN);
