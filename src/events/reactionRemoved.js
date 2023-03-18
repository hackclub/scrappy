import { getReactionRecord } from "../lib/utils.js";
import { getUserRecord } from "../lib/users.js";
import Bottleneck from "bottleneck";
import prisma from "../lib/prisma.js";

const limiter = new Bottleneck({
  maxConcurrent: 1,
});

export default async ({ event }) => {
  const { item, user, reaction } = event;
  const ts = item.ts;
  limiter.schedule(async () => {
    const update = (
      await prisma.updates.findMany({
        where: {
          messageTimestamp: parseFloat(ts),
        },
      })
    )[0];
    if (!update) return;
    const reactionRecord = await getReactionRecord(reaction, update.id);
    if (typeof reactionRecord == "undefined") return;
    const userRecord = await getUserRecord(user);
    let usersReacted = reactionRecord.usersReacted;
    const updatedUsersReacted = usersReacted.filter(
      (userReacted) => userReacted != userRecord.id
    );
    if (updatedUsersReacted.length === 0) {
      await prisma.emojiReactions.deleteMany({
        where: {
          id: reactionRecord.id,
        },
      });
    } else {
      await prisma.emojiReactions.update({
        where: { id: reactionRecord.id },
        data: { usersReacted: updatedUsersReacted },
      });
    }
  });
};
