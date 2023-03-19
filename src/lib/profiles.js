import { app } from "../app.js";
import { t } from "./transcript.js";
import { getUserRecord } from "./users.js";
import prisma from "./prisma.js";

export const setStatus = async (user, statusText, statusEmoji) => {
  try{
    const setProfile = app.client.users.profile.set({
      token: process.env.SLACK_USER_TOKEN,
      user,
      profile: {
        status_text: statusText,
        status_emoji: statusEmoji,
        status_expiration: 0,
      },
    });
  }
  catch(e){
    app.client.chat.postMessage({
      channel: "U0266FRGP",
      text: t("messages.errors.zach"),
    });
  }
};

export const setAudio = async (user, url) => {
  const userRecord = await getUserRecord(user);
  await prisma.accounts.update({
    where: {
      slackID: userRecord.slackID,
    },
    data: {
      customAudioURL: url,
    },
  });
};
