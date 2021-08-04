import {
  getUserRecord,
  setStatus,
  unverifiedRequest,
  accountsTable
} from '../../../lib/api-utils'
import fetch from 'node-fetch'
import prisma from '../../../lib/prisma'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  console.log(req.body)

  const { user } = req.body.event
  const statusEmoji = user.profile.status_emoji

  const userRecord = await getUserRecord(user.id)

  if (statusEmoji.includes('som-')) {
    const statusEmojiCount = statusEmoji.split('-')[1].split(':')[0]
    console.log('count', statusEmojiCount)
    const userRecord = await getUserRecord(user.id)
    const streakCount = userRecord.streakCount
    console.log('user record count', streakCount)
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

  const info = await fetch(
    `https://slack.com/api/users.info?token=${process.env.SLACK_BOT_TOKEN}&user=${user.id}`
  ).then((r) => r.json())
  const tzOffset = info.user.tz_offset
  const tz = info.user.tz.replace(`\\`, '')

  const avatar = user.profile.image_192 // user = require(the event
  if (!user.profile.fields) return
  const github = user.profile.fields['Xf0DMHFDQA']?.value
  const website = user.profile.fields['Xf5LNGS86L']?.value

  if (github != userRecord.fields['GitHub']) {
    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { github: github }
    })
  }
  if (website != userRecord.fields['Website']) {
    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { website: website }
    })
  }
  let cdnAPIResponse = await fetch('https://cdn.hackclub.com/api/v1/new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([avatar])
  }).then((r) => r.json())
  await prisma.accounts.update({
    where: { slackID: userRecord.slackID },
    data: { timezoneOffset: tzOffset, timezone: tz, avatar: cdnAPIResponse[0] }
  })
}
