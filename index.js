require('dotenv').config();

const schedule = require('./schedule');

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
})

client.once('clientReady', () => {
   console.log('Hejo');
});

client.login(process.env.DISCORD_TOKEN);

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content === '!ping') {
        message.reply('pong!')
    }
    if (message.content === '!help') {
        message.reply('')
    }
    if (message.content === '!przypomnij') {
        const args = message.content.split(' ');
        const minutesBefore = parseInt(args[args.length - 1]);
        const lookingEvent = args.slice(1, -1).join(' ');
        console.log(`Szukamy bossa: ${lookingEvent}, przypomnienie: ${minutesBefore} min przed.`);

        const time = timeWait * 60 * 1000;
        message.reply(`Przypomnienie ustawione. Zawołam Cię ${minutesBefore} minut przed rozpoczęciem **${lookingEvent}**.`);

        setTimeout(() => {
            message.reply(`Hej ${message.author}! **${lookingEvent}** zaczyna się za ${minutesBefore} minut! Szykuj się!`);
        }, time);
    }
    if (message.content.startsWith('!eventy')) {
        const args = message.content.split(' ')
        console.log(schedule);
        const timeInterval = args[1] ? parseInt(args[1]) : 30;

        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();
        const currentTime = (currentHour * 60) + currentMinute;

        let answer = `Eventy zaczynające się w ciągu najbliższych ${timeInterval} minut:\n\n`;
        let found = false;

        for (const boss of schedule) {
            for (const time of boss.time) {
                const eventTimeSplit = time.split(':')
                const eventTimeUTC = parseInt(eventTimeSplit[0]) * 60 + parseInt(eventTimeSplit[1]);
                const zoneTime = now.getTimezoneOffset();
                const eventTime = eventTimeUTC + zoneTime;

                if (eventTime >= currentTime && eventTime <= currentTime + timeInterval) {
                    answer += `**${boss.event}** o **${time}** na mapie *${boss.map}* (WP: \`${boss.waypoint}\`)\n`;
                    found = true;
                }
            }
        }
        if (!found && timeInterval == NaN) {
            answer = 'Użyj polecenia !event *ilość minut* aby wyszukać eventy w danym przedziale czasowym.'
        }
        if (!found) {
            answer = `W ciągu najbliższych ${timeInterval} minut nie zaczyna się żaden event.`
        }
        message.reply(answer);
    }
});