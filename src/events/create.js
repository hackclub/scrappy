/*
This is triggered when a new post shows up in the #scrapbook channel

- posts without attachments should be rejected with an ephemeral message
- posts with attachments should be added to the scrapbook & replied to with a threaded message
*/

import { createUpdate } from "../lib/updates.js";
import deleted from "./deleted.js";
import { postEphemeral } from "../lib/slack.js";

export default async ({ event }) => {
  console.log("message event", event);
  if (event.subtype == "message_deleted") {
    await deleted({ event });
    // send ephemeral message to signal user the message was deleted
    await postMessage(
      event.channel,
      "Your scrapbook update has been deleted :boom:",
      event.user
    )
  }

  if (event.thread_ts || event.channel != process.env.CHANNEL) return;
  const { files = [], channel, ts, user, text, thread_ts } = event;
  if (!thread_ts) await createUpdate(files, channel, ts, user, text);
};
