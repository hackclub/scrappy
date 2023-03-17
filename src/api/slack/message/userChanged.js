import {
  getUserRecord,
  setStatus,
  unverifiedRequest,
} from '../../../lib/api-utils.js'
import fetch from 'node-fetch'
import prisma from '../../../lib/prisma.js'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user } = req.body.event
  const statusEmoji = user.profile.status_emoji

  const userRecord = await getUserRecord(user.id)

  if (statusEmoji.includes('som-')) {
    const statusEmojiCount = statusEmoji.split('-')[1].split(':')[0]
    const userRecord = await getUserRecord(user.id)
    const streakCount = userRecord.streakCount
    if (
      (streakCount != statusEmojiCount && streakCount <= 7) ||
      ('7+' != statusEmojiCount && streakCount >= 8)
    ) {
      setStatus(
        user.id,
        `I tried to cheat Scrappy because I’m a clown`,
        ':clown_face:'
      )
    }
  }

  // While we're here, check if any of the user's profile fields have been changed & update them

  const info = await fetch(`https://slack.com/api/users.info?user=${user.id}`, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    }
  }).then((r) => r.json())
  const tzOffset = info.user.tz_offset
  const tz = info.user.tz.replace(`\\`, '')
  const avatar = user.profile.image_192 // user = require(the event
  if (!user.profile.fields) return
  const github = user.profile.fields['Xf0DMHFDQA']?.value
  const website = user.profile.fields['Xf5LNGS86L']?.value

  if (github != userRecord.github) {
    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { github: github }
    })
  }
  if (website != userRecord.website) {
    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { website: website }
    })
  }
  await prisma.accounts.update({
    where: { slackID: userRecord.slackID },
    data: { timezoneOffset: tzOffset, timezone: tz, avatar: avatar, email: user.profile.fields.email }
  })
}
