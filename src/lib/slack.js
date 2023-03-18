import { app } from "../app.js";

// ex. react('add', 'C248d81234', '12384391.12231', 'beachball')
export const react = async (addOrRemove, channel, ts, reaction) => {
  try {
    await app.client.reactions[addOrRemove]({
      channel: channel,
      name: reaction,
      timestamp: ts,
    });
  } catch {}
}
  

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
    return history.messages[0] || null;
  } catch (e) {
    return null;
  }
};

export const postEphemeral = (channel, text, user, threadTs) =>
  app.client.chat.postEphemeral({
    attachments: [],
    channel: channel,
    text: text,
    user: user,
    thread_ts: threadTs,
  });
