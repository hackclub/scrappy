export const shouldUpdateStreak = async (userId, increment) => {
  const userRecord = await getUserRecord(userId);
  const latestUpdates = await prisma.updates.findMany({
    orderBy: {
      postTime: "desc",
    },
    where: {
      accountsSlackID: userRecord.slackID,
    },
  });
  const createdTime = increment
    ? latestUpdates[1]?.postTime
    : latestUpdates[0]?.postTime;
  const today = getDayFromISOString(getNow(userRecord.timezone));
  const createdDay = getDayFromISOString(createdTime);
  return (
    today != createdDay || (increment ? !latestUpdates[1] : !latestUpdates[0])
  );
};

export const streaksToggledOff = async (user) => {
  const userRecord = await getUserRecord(user);
  return userRecord.streaksToggledOff;
};

export const incrementStreakCount = (userId, channel, message, ts) =>
  new Promise(async (resolve, reject) => {
    const userRecord = await getUserRecord(userId);
    const shouldUpdate = await shouldUpdateStreak(userId, true);
    const randomWebringPost = await getRandomWebringPost(userId);
    let updatedMaxStreakCount;
    const updatedStreakCount = userRecord.streakCount + 1;
    const scrapbookLink =
      "https://scrapbook.hackclub.com/" + userRecord.username;
    if (shouldUpdate) {
      if (userRecord.newMember && updatedStreakCount > 1) {
        await prisma.accounts.update({
          where: {
            slackID: userRecord.slackID,
          },
          data: {
            newMember: false,
          },
        });
      }
      if (
        userRecord.maxStreaks < updatedStreakCount ||
        !userRecord.maxStreaks
      ) {
        updatedMaxStreakCount = updatedStreakCount;
      } else {
        updatedMaxStreakCount = userRecord.maxStreaks;
      }
      await prisma.accounts.update({
        where: {
          slackID: userRecord.slackID,
        },
        data: {
          maxStreaks: updatedMaxStreakCount,
          streakCount: updatedStreakCount,
        },
      });
      await displayStreaks(userId, updatedStreakCount);
      if (userRecord.newMember && updatedStreakCount === 1) {
        postEphemeral(channel, t("messages.streak.newstreak"), userId);
      }
    }
    const replyMessage = await getReplyMessage(
      userId,
      userRecord.username,
      updatedStreakCount
    );
    await react("remove", channel, ts, "beachball"); // remove beachball react
    await react("add", channel, ts, SEASON_EMOJI);
    if (typeof channelKeywords[channel] !== "undefined")
      await react("add", channel, ts, channelKeywords[channel]);
    await reactBasedOnKeywords(channel, message, ts);
    await reply(
      channel,
      ts,
      shouldUpdate
        ? replyMessage
        : t("messages.streak.nostreak", { scrapbookLink })
    );
    if (randomWebringPost.post) {
      await reply(
        channel,
        ts,
        t("messages.webring.random", {
          randomWebringPost: randomWebringPost.post,
        }),
        true
      );
    } else if (!randomWebringPost.post && randomWebringPost.nonexistence) {
      await reply(
        channel,
        ts,
        t("messages.webring.nonexistence", {
          scrapbookUrl: randomWebringPost.scrapbookUrl,
        })
      );
    }
    resolve();
  }).catch((err) => reply(channel, ts, t("messages.errors.promise", { err })));

export const getReplyMessage = async (user, username, day) => {
  const newMember = await isNewMember(user);
  const toggledOff = await streaksToggledOff(user);
  const scrapbookLink = `https://scrapbook.hackclub.com/${username}`;
  let streakNumber = day <= 7 ? day : "7+";
  if (toggledOff) streakNumber = "7+";
  if (!newMember && day <= 3 && !toggledOff) {
    return t("messages.streak.oldmember." + streakNumber, {
      scrapbookLink,
      user,
    });
  }
  return t("messages.streak." + streakNumber, { scrapbookLink, user });
};

export const displayStreaks = async (userId, streakCount) => {
  const userRecord = await getUserRecord(userId);
  const user = await app.client.users.profile.get({ user: userId });
  if (!userRecord.streaksToggledOff) {
    if (streakCount == 0 || !userRecord.displayStreak) {
      setStatus(userId, "", "");
    } else {
      const statusText = "day streak in #scrapbook";
      const statusEmoji = `:som-${streakCount > 7 ? "7+" : streakCount}:`;
      setStatus(userId, statusText, statusEmoji);
    }
  }
};
