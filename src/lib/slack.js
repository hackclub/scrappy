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
  } catch (err) {
    throw Error(err);
  }
};

// replies to a message in a thread
// ex. reply('C34234d934', '31482975923.12331', 'this is a threaded reply!')
export const reply = async (channel, parentTs, text, unfurl) => {
  try {
    await app.client.chat.postMessage({
      channel: channel,
      thread_ts: parentTs,
      text: text,
      parse: "mrkdwn",
      unfurl_links: unfurl,
      unfurl_media: false,
    });

  } catch (err) {
    throw Error(err);
  }
}

export const getMessage = async (ts, channel) => {
  try {
    const history = await app.client.conversations.history({
      channel,
      latest: ts,
      limit: 1,
      inclusive: true,
    });
    return history.messages[0] || null;
  } catch (e) {
    throw Error(e);
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
  } catch (e) {
    throw Error(e);
  }
};
