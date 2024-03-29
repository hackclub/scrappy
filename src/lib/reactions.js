import { react } from "./slack.js";
import prisma from "./prisma.js";
import emojiKeywords from "./emojiKeywords.js";

export const getReactionRecord = async (emoji, updateId) =>
  await prisma.emojiReactions.findFirst({
    where: {
      emojiTypeName: emoji,
      updateId: updateId,
    },
  });

export const reactBasedOnKeywords = async (channel, message, ts) => {
  for (const [keyword, emojiName] of Object.entries(emojiKeywords)) {
    if (message?.toLowerCase().includes(keyword.toLowerCase())) {
      try {
        await react("add", channel, ts, emojiKeywords[keyword]);

   /*     const update = await prisma.updates.findFirst({
          where: { messageTimestamp: parseFloat(ts) },
        });

        if (update) {
          const reactionExists = await getReactionRecord(emojiName, update.id);

          if (!reactionExists) {
            await prisma.emojiReactions.create({
              data: {
                updateId: update.id,
                emojiTypeName: emojiName,
              },
            });
          }
        }*/
      } catch (e) {
        console.error(`Error processing keyword '${keyword}':`, e);
      }
    }
  }
};