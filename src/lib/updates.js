export const createUpdate = async (files = [], channel, ts, user, text) => {
  let attachments = [];
  let videos = [];
  let videoPlaybackIds = [];
  const upload = await Promise.all([
    react("add", channel, ts, "beachball"),
    ...files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(file.url_private, channel, user);
      if (!publicUrl) {
        await Promise.all([
          react("remove", channel, ts, "beachball"),
          react("add", channel, ts, "x"),
          reply(channel, ts, t("messages.errors.filetype")),
        ]);
        return "error";
      } else if (publicUrl.url === "heic") {
        await Promise.all([
          react("remove", channel, ts, "beachball"),
          react("add", channel, ts, "x"),
          reply(channel, ts, t("messages.errors.heic")),
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
    }),
  ]).then((values) => {
    if (values[1] === "error") return "error";
  });
  if (upload === "error") return;
  let userRecord = await getUserRecord(user);
  const date = new Date().toLocaleString("en-US", {
    timeZone: userRecord.timezone,
  });
  const convertedDate = new Date(date).toISOString();
  const messageText = await formatText(text);
  await prisma.updates.create({
    data: {
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
  await incrementStreakCount(user, channel, messageText, ts);
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
