import { app } from "../app.js";
import metrics from "../metrics.js"

// ex. react('add', 'C248d81234', '12384391.12231', 'beachball')
export const react = async (addOrRemove, channel, ts, reaction) => {
  try {
    await app.client.reactions[addOrRemove]({
      channel: channel,
      name: reaction,
      timestamp: ts,
    });
    metrics.increment("success.react", 1);
  } catch {
    metrics.increment("error.react", 1);
  }
};

// replies to a message in a thread
// ex. reply('C34234d934', '31482975923.12331', 'this is a threaded reply!')
export const reply = async (channel, parentTs, text, unfurl) =>
  await app.client.chat.postMessage({
    channel: channel,
    thread_ts: parentTs,
    text: text,
    parse: "mrkdwn",
    unfurl_links: unfurl,
    unfurl_media: false,
  });

export const getMessage = async (ts, channel) => {
  try {
    const history = await app.client.conversations.history({
      channel,
      latest: ts,
      limit: 1,
      inclusive: true,
    });
    metrics.increment("success.get_message", 1);
    return history.messages[0] || null;
  } catch (e) {
    metrics.increment("error.get_message", 1);
    return null;
  }
};

export const postEphemeral = async (channel, text, user, threadTs) => {
  try {
    await app.client.chat.postEphemeral({
      attachments: [],
      channel: channel,
      text: text,
      user: user,
      thread_ts: threadTs,
    });
    metrics.increment("success.post_ephemeral", 1);
  } catch (e) {
    metrics.increment("error.post_ephemeral", 1);
    console.log(e);
  }
};
