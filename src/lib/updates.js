import prisma from "./prisma.js";
import { react, reply, postEphemeral } from "./slack.js";
import { getPublicFileUrl } from "./files.js";
import { t } from "./transcript.js";
import { getUserRecord } from "./users.js";
import { formatText } from "./utils.js";
import { incrementStreakCount } from "./streaks.js";
import { app } from "../app.js";
import metrics from "../metrics.js";

export const createUpdate = async (files = [], channel, ts, user, text) => {
  let attachments = [];
  let videos = [];
  let videoPlaybackIds = [];

  let uploadItems = [];

  if (files.length > 0) {
    uploadItems = files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(file.url_private, channel, user);
      if (!publicUrl) {
        await Promise.all([
          react("remove", channel, ts, "beachball"),
          react("add", channel, ts, "x"),
          reply(channel, ts, t("messages.errors.filetype")),
        ]);
        return "error";
      } else if (publicUrl.url.toLowerCase().endsWith("heic")) {
        await Promise.all([
          react("remove", channel, ts, "beachball"),
          react("add", channel, ts, "x"),
          postEphemeral(channel, t("messages.errors.heic"), user),
          app.client.chat.delete({
            token: process.env.SLACK_USER_TOKEN,
            channel,
            ts,
          }),
        ]);
        return "error";
      } else if (publicUrl.url === "big boy") {
        await Promise.all([
          react("remove", channel, ts, "beachball"),
          reply(channel, ts, t("messages.errors.bigimage")),
        ]);
      }
      attachments.push(publicUrl.url);
      if (publicUrl.muxId) {
        videos.push(publicUrl.muxId);
        videoPlaybackIds.push(publicUrl.muxPlaybackId);
      }
    })
  }

  uploadItems.unshift(react("add", channel, ts, "beachball"));
  const upload = await Promise.all(uploadItems).then((values) => {
    if (values[1] === "error" || (values.length < 2 && files.length > 0)) return "error";
  });

  if (files.length > 0 && upload === "error") { metrics.increment("errors.file_upload", 1); return "error"; };
  let userRecord = await getUserRecord(user);

  const date = new Date().toLocaleString("en-US", {
    timeZone: userRecord.timezone,
  });

  const convertedDate = new Date(date).toISOString();
  const messageText = await formatText(text);

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
}
