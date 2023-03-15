import {
  react,
  deleteScrap,
  postEphemeral,
  setStatus,
  displayStreaks,
  shouldUpdateStreak,
  updateExistsTS,
} from "../lib/api-utils.js";
import { getUserRecord } from "../lib/users.js";
import fetch from "node-fetch";

const deleteThreadedMessages = async (ts, channel, user) => {
  let result = await app.conversations.replies({ channel, ts });
  await Promise.all(
    result.messages.map(async (msg) => {
      if (msg.ts != msg.thread_ts) {
        return await app.chat.delete({ channel, ts: msg.ts });
      } else {
        return null;
      } // top-level comment
    })
  );
  const userRecord = await getUserRecord(user);
  const shouldUpdate = await shouldUpdateStreak(user, false);
  if (shouldUpdate) {
    const updatedStreakCount = userRecord.streakCount - 1;
    if (updatedStreakCount >= 0) {
      await prisma.accounts.update({
        where: { slackID: userRecord.slackID },
        data: { streakCount: updatedStreakCount },
      });
      displayStreaks(user, updatedStreakCount);
    }
  }
  postEphemeral(channel, `Your scrapbook update has been deleted :boom:`, user);
};

export default async ({ event, ack }) => {
  const { channel, message, previous_message, thread_ts } = event;
  const ts = thread_ts || message.thread_ts;
  const hasScrap = await updateExistsTS(ts);
  if (ts && hasScrap) {
    await Promise.all([
      await react("remove", channel, ts, "beachball"),
      await react("add", channel, ts, "boom"),
    ]);
    await Promise.all([
      react("add", channel, ts, "beachball"),
      deleteScrap(ts),
      deleteThreadedMessages(ts, channel, previous_message.user),
    ]);
  }
};
