import { App, ExpressReceiver } from "@slack/bolt";
import sendStartupMessage from "./api/startup";

if (!process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
  throw "Missing credentials";
}

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  receiver,
  token: process.env.SLACK_BOT_TOKEN,
});

receiver.router.get("/ping", (_req, res) => {
  res.send("pong!");
});

/* Add functionality here */
// TODO
require("./router")(app);

(async () => {
  // Start the app
  await app.start(process.env.PORT ? parseInt(process.env.PORT) : 3000);
  console.log("⚡️ Bolt app is running!");
  await sendStartupMessage(app.client, process.env.SLACK_BOT_TOKEN!);
})();