import prisma from "./prisma.js";
import { react, reply, postEphemeral } from "./slack.js";
import { getPublicFileUrl } from "./files.js";
import { t } from "./transcript.js";
import { getUserRecord } from "./users.js";
import { formatText, extractOgUrl, getAndUploadOgImage, getUrls, getPageContent } from "./utils.js";
import { incrementStreakCount } from "./streaks.js";
import { app } from "../app.js";
import metrics from "../metrics.js";
import { getSubcribedApps } from "./airtable.js";

export const createUpdate = async (files = [], channel, ts, user, text) => {
  let attachments = [];
  let videos = [];
  let videoPlaybackIds = [];
  const upload = await Promise.all([
    react("add", channel, ts, "beachball"),
    ...files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(file.url_private, channel, user);
      if (!publicUrl) {
        await postEphemeral(channel, ts, t("messages.errors.filetype"), user)
        return;
      } else if (publicUrl.url.toLowerCase().endsWith("heic")) {
        await postEphemeral(channel, t("messages.errors.heic"), user);
        return;
      }
      attachments.push(publicUrl.url);
      if (publicUrl.muxId) {
        videos.push(publicUrl.muxId);
        videoPlaybackIds.push(publicUrl.muxPlaybackId);
      }
    }),
  ])

  // if there are no attachments, attempt to get from the first link having an og image 
  if (!text) return;
  const urls = getUrls(text);
  if (urls) {
    for (const url of urls) {
      const pageContent = await getPageContent(url);
      const ogUrls = extractOgUrl(pageContent);

      if (!ogUrls) continue;

      let imageUri = await getAndUploadOgImage(ogUrls);
      attachments.push(imageUri);
      break;
    }
  }

  if ((attachments.length + videos.length) === 0) {
    await Promise.all([
      react("remove", channel, ts, "beachball"),
      react("add", channel, ts, "x"),
      // delete message if no media files
      app.client.chat.delete({
        token: process.env.SLACK_USER_TOKEN,
        channel,
        ts
      }),
      // notify user they need to include an image, video or link with preview
      postEphemeral(channel, t("messages.delete", { text }), user)
    ]);
    metrics.increment("errors.file_upload", 1);
    return "error";
  }

  let userRecord = await getUserRecord(user);

  const date = new Date().toLocaleString("en-US", {
    timeZone: userRecord.timezone,
  });

  const convertedDate = new Date(date).toISOString();
  const messageText = await formatText(text);

  const userInfo = app.client.users.info({
    user: userRecord.slackID
  });

  const updateInfo = {
    messageText,
    postTime: convertedDate,
    attachments,
    userInfo
  };

  // at this point updates can be created and saved
  const subcribers = await getSubcribedApps();

  for (const subcriber of subcribers) {
    try {
      await fetch(subcriber.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateInfo)
      });
    } catch { } // silently fail to not crash app
  }

  const update = await prisma.updates.create({
    data: {
      accountsID: userRecord.id,
      accountsSlackID: userRecord.slackID,
      postTime: convertedDate,
      messageTimestamp: parseFloat(ts),
      text: messageText,
      attachments: attachments,
      muxAssetIDs: videos,
      muxPlaybackIDs: videoPlaybackIds,
      isLargeVideo: attachments.some(
        (attachment) => attachment.url === "https://i.imgur.com/UkXMexG.mp4"
      ),
      channel: channel,
    },
  });

  metrics.increment("new_post", 1);
  await incrementStreakCount(user, channel, messageText, ts);
  return update;
};

export const updateExists = async (updateId) =>
  prisma.emojiReactions
    .findMany({
      where: {
        updateId: updateId,
      },
    })
    .then((r) => r.length > 0);

export const updateExistsTS = async (TS) =>
  prisma.updates
    .findMany({
      where: {
        messageTimestamp: parseFloat(TS),
      },
    })
    .then((r) => r.length > 0);

export const deleteUpdate = async (ts) => {
  return await prisma.updates.deleteMany({
    where: {
      messageTimestamp: parseFloat(ts),
    },
  });
};
