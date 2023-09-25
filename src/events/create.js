/*
This is triggered when a new post shows up in the #scrapbook channel

- posts without attachments should be rejected with an ephemeral message
- posts with attachments should be added to the scrapbook & replied to with a threaded message
*/

import { createUpdate } from "../lib/updates.js";

export default async ({ event }) => {
  if (event.thread_ts || event.channel != process.env.CHANNEL) return;
  const { files = [], channel, ts, user, text, thread_ts } = event;
  try {
    if (!thread_ts) await createUpdate(files, channel, ts, user, text);
  } catch (err) {
    throw Error(err);
  }
};
