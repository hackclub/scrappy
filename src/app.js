const { App, subtype } = require("@slack/bolt");
import { execute } from "./lib/utils.js";
import { t } from "./lib/transcript.js";
import { mux } from "./routes/mux.js";
import help from "./commands/help.js";
import setAudio from "./commands/setaudio.js";
import setCSS from "./commands/setcss.js";
import setDomain from "./commands/setdomain.js";
import setUsername from "./commands/setusername.js";
import toggleStreaks from "./commands/togglestreaks.js";
import webring from "./commands/webring.js";
import joined from "./events/joined";
import userChanged from "./events/joined";
import create from "./events/create";
import deleted from "./events/deleted";
import mention from "./events/mention";
import updated from "./events/updated";
import forget from "./events/forget";
import noFile, { noFileCheck } from "./events/noFile";
import reactionAdded from "./events/reactionAdded";
import reactionRemoved from "./events/reactionAdded";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  customRoutes: [mux],
});

app.command("/scrappy", execute(help));

app.command("/scrappy-help", execute(help));

app.command("/scrappy-setaudio", execute(setAudio));

app.command("/scrappy-setcss", execute(setCSS));

app.command("/scrappy-setdomain", execute(setDomain));

app.command("/scrappy-setusername", execute(setUsername));

app.command("/scrappy-togglestreaks", execute(toggleStreaks));

app.command("/scrappy-webring", execute(webring));

app.event("reaction_added", execute(reactionAdded));

app.event("reaction_removed", execute(reactionRemoved));

app.event("member_joined_channel", execute(joined));

app.event("user_change", execute(userChanged));

app.message(subtype("file_share"), execute(create));

app.message(noFileCheck, execute(noFile));

app.event(subtype("message_deleted"), execute(deleted));

app.event(subtype("message_changed"), execute(updated));

app.event("forget scrapbook", execute(forget));

app.message("<@U015D6A36AG>", execute(mention));

(async () => {
  await app.start(process.env.PORT || 3000);
  let latestCommitMsg = "misc...";
  await fetch("https://api.github.com/repos/hackclub/scrappy/commits/main")
    .then((r) => r.json())
    .then((d) => (latestCommitMsg = d.commit.message));
  app.client.chat.postMessage({
    channel: "C0P5NE354",
    text: t("startup.message", { latestCommitMsg }),
    parse: "mrkdwn",
    unfurl_links: false,
    unfurl_media: false,
  });
  console.log("⚡️ Scrappy is running!");
})();
