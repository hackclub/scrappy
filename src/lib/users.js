export const getUserRecord = async (userId) => {
  const user = await fetch(
    `https://slack.com/api/users.profile.get?user=${userId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
    }
  ).then((r) => r.json());

  if (user.profile === undefined) {
    return;
  }
  let record = await prisma.accounts.findUnique({
    where: {
      slackID: userId,
    },
  });
  if (record === null) {
    let profile = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      }
    ).then((r) => r.json());
    let username =
      user.profile.display_name !== ""
        ? user.profile.display_name.replace(/\s/g, "")
        : user.profile.real_name.replace(/\s/g, "");
    let tzOffset = profile.user.tz_offset;
    let tz = profile.user.tz.replace(`\\`, "");
    let checkIfExists = prisma.accounts.findFirst({
      where: { username: username },
    });
    record = await prisma.accounts.create({
      data: {
        slackID: userId,
        username: checkIfExists == null ? username : username + "-" + userId,
        streakCount: 0,
        website: user.profile.fields["Xf5LNGS86L"]?.value || null,
        github: user.profile.fields["Xf0DMHFDQA"]?.value || null,
        newMember: true,
        avatar: user.profile.image_192,
        timezoneOffset: tzOffset,
        timezone: tz,
      },
    });
    if (!user.profile.is_custom_image) {
      const animalImages = [
        "https://i.imgur.com/njP1JWx.jpg",
        "https://i.imgur.com/NdOZWDB.jpg",
        "https://i.imgur.com/l8dV3DJ.jpg",
        "https://i.imgur.com/Ej6Ovlq.jpg",
        "https://i.imgur.com/VG29lvI.jpg",
        "https://i.imgur.com/tDusvvD.jpg",
        "https://i.imgur.com/63H1hQM.jpg",
        "https://i.imgur.com/xGtLTa3.png",
      ];
      const animalImage = sample(animalImages);
      await prisma.accounts.update({
        where: { slackID: userId },
        data: { avatar: animalImage },
      });
    }
  }
  return { ...record, slack: user };
};
