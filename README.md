# blurobot

this is a discord bot dedicated to showing the status of @theblurry99's blurryCast internet radio station

this bot does not use slash commands because I think they're dumb and they take a lot of time to update and they work in a weird way.

also note: this will not work on windows

## setup

1. `git switch release`
2. `cp config.json.dist config.json`
3. adjust `config.json` if needed (you shouldn't really need to do anything)
4. make a `.env` file to add an environment variable called `TOKEN` which should contain your bot's token
5. `npm i` to pull all the dependencies
6. `npm start` to run the bot once, verify everything works then ^C
7. `npm run daemon` to run the bot in the background
8. find a way to periodically run `update.sh`, or just run that yourself to check for updates and update if needed
