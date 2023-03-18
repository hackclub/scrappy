import bolt from '@slack/bolt';
const { App, subtype } = bolt;
import fetch from 'node-fetch'
import { t } from "./lib/transcript.js";
import { mux } from "./routes/mux.js";
import help from "./commands/help.js";
import setAudio from "./commands/setaudio.js";
import setCSS from "./commands/setcss.js";
import setDomain from "./commands/setdomain.js";
import setUsername from "./commands/setusername.js";
import toggleStreaks from "./commands/togglestreaks.js";
import webring from "./commands/webring.js";
import joined from "./events/joined.js";
import userChanged from "./events/joined.js";
import create from "./events/create.js";
import deleted from "./events/deleted.js";
import mention from "./events/mention.js";
import updated from "./events/updated.js";
import forget from "./events/forget.js";
import noFile, { noFileCheck } from "./events/noFile.js";
import reactionAdded from "./events/reactionAdded.js";
import reactionRemoved from "./events/reactionAdded.js";

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  customRoutes: [mux],
});

export const execute = async (actionToExecute) => {
  return async (slackObject, ...props) => {
    await slackObject.ack();
    await functionAdd(slackObject, ...props);
  };
};

app.command("/scrappy", execute(help));

app.command("/scrappy-help", execute(help));

app.command("/scrappy-setaudio", execute(setAudio));

app.command("/scrappy-setcss", execute(setCSS));

app.command("/scrappy-setdomain", execute(setDomain));

app.command("/scrappy-setusername", execute(setUsername));

app.command("/scrappy-togglestreaks", execute(toggleStreaks));

app.command("/scrappy-webring", execute(webring));

app.event("reaction_added", reactionAdded);

app.event("reaction_removed", reactionRemoved);

app.event("member_joined_channel", joined);

app.event("user_change", userChanged);
 
app.message(subtype("file_share"), create);

app.message(noFileCheck, noFile);

app.event(subtype("message_deleted"), deleted);

app.event(subtype("message_changed"), updated);

app.event("forget scrapbook", forget);

app.message("<@U015D6A36AG>", mention);

(async () => {
  await app.start(process.env.PORT || 3000);
  let latestCommitMsg = "misc...";
  await fetch("https://api.github.com/repos/hackclub/scrappy/commits/main")
    .then((r) => r.json())
    .then((d) => (latestCommitMsg = d.commit?.message || ""));
  app.client.chat.postMessage({
    channel: "C0P5NE354",
    text: t("startup.message", { latestCommitMsg }),
    parse: "mrkdwn",
    unfurl_links: false,
    unfurl_media: false,
  });
  console.log("⚡️ Scrappy is running !"); 
})(); 
