import { setStatus } from "../lib/utils.js";
import { getUserRecord } from "../lib/users.js";
import { app } from "../app.js";
import prisma from "../lib/prisma.js";

export default async ({ event }) => {
  const { user } = event;
  const statusEmoji = user.profile.status_emoji;
  if (statusEmoji.includes("som-")) {
    const statusEmojiCount = statusEmoji.split("-")[1].split(":")[0];
    const { streakCount } = await getUserRecord(user.id);
    if (
      (streakCount != statusEmojiCount && streakCount <= 7) ||
      ("7+" != statusEmojiCount && streakCount >= 8)
    ) {
      setStatus(
        user.id,
        `I tried to cheat Scrappy because I’m a clown`,
        ":clown_face:"
      );
    }
  }
  // While we're here, check if any of the user's profile fields have been changed & update them
  const info = app.client.users.info({
    user: user.id,
  });
  if (!user.profile.fields) return;
  await prisma.accounts.update({
    where: { slackID: user.id },
    data: {
      timezoneOffset: info.user.tz_offset,
      timezone: info.user.tz.replace(`\\`, ""),
      avatar: user.profile.image_192,
      email: user.profile.fields.email,
      website: user.profile.fields["Xf5LNGS86L"]?.value || undefined,
      github: user.profile.fields["Xf0DMHFDQA"]?.value || undefined,
    },
  });
};
