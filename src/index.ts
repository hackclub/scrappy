// gonna need to ESMify this - TODO @cfanoulis

import * as dotenv from 'dotenv';
dotenv.config();

import { App, LogLevel } from '@slack/bolt';

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	appToken: process.env.SLACK_SOCKET_TOKEN,
	socketMode: Boolean(process.env.SLACK_SOCKET_TOKEN),
	logLevel: LogLevel.DEBUG
});

void (async () => {
	// Start your app
	await app.start(Number(process.env.PORT) || 3000);

	console.log('⚡️ Bolt app is running!');
})();
