// This function is called when a poster updates their previous post

import { postEphemeral, formatText } from "../lib/api-utils.js";
import { getUserRecord } from "../lib/users.js";
import prisma from "../lib/prisma.js";

export default async ({ event }) => {
  const updateRecord = (
    await prisma.updates.findMany({
      where: {
        messageTimestamp: parseFloat(event.previous_message.ts),
      },
    })
  )[0];
  if (updateRecord) {
    const newMessage = await formatText(event.message.text);
    await prisma.updates.update({
      where: { id: updateRecord.id },
      data: { text: newMessage },
    });
    await postEphemeral(
      event.channel,
      `Your post has been edited! You should see it update on the website in a few seconds.`,
      event.message.user
    );
    const userRecord = await getUserRecord(event.message.user);
  }
};
