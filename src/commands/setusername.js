import prisma from "../../../lib/prisma.js";
import { t } from "../lib/transcript.js";
import { getUserRecord } from "../lib/users.js";

export default async ({ command, ack, respond }) => {
  const { text, user_id, response_url } = command;
  let username = text.split(" ")[0]?.replace(" ", "_");
  const userRecord = await getUserRecord(user_id);
  const exists = await prisma.accounts.findMany({ where: { username } });
  if (
    userRecord.lastUsernameUpdatedTime > new Date(Date.now() - 86400 * 1000)
  ) {
    sendCommandResponse(response_url, t("messages.username.time"));
  } else if (!username) {
    sendCommandResponse(response_url, t("messages.username.noargs"));
  } else if (username.length < 2) {
    sendCommandResponse(response_url, t("messages.username.short"));
  } else if (exists.length > 0) {
    sendCommandResponse(response_url, t("messages.username.exists"));
  } else {
    await prisma.accounts.update({
      // update the account with the new username
      where: { slackID: userRecord.slackID },
      data: {
        username: username,
        lastUsernameUpdatedTime: new Date(Date.now()),
      },
    });
    await respond(
      t("messages.username.set", {
        url: `https://scrapbook.hackclub.com/${username}`,
      })
    );
  }
};
