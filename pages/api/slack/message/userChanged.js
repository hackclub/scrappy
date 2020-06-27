import {
  getUserRecord,
  setStatus,
  unverifiedRequest
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  console.log(req.body)

  const user = req.body.event.user
  const statusEmoji = user.profile.status_emoji

  const { user_id, response_url } = req.body

  const userRecord = await getUserRecord(user_id)

  const user = await fetch(
    `https://slack.com/api/users.info?token=${process.env.SLACK_BOT_TOKEN}&user=${user_id}`
  ).then((r) => r.json())
  console.log(user)
  const tzOffset = user.user.tz_offset
  const tz = user.user.tz.replace(`\\`, '')
  const profile = await fetch(
    `https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${user_id}`
  ).then((r) => r.json())
  const avatar = profile.profile.image_192
  const github = profile.profile.fields['Xf0DMHFDQA']?.value
  const website = profile.profile.fields['Xf5LNGS86L']?.value

  if (statusEmoji.includes('som-')) {
    const statusEmojiCount = statusEmoji.split('-')[1].split(':')[0]
    console.log('count', statusEmojiCount)
    const userRecord = await getUserRecord(user.id)
    const streakCount = userRecord.fields['Streak Count']
    console.log('user record count', streakCount)
    if (
      (streakCount != statusEmojiCount && streakCount <= 7) ||
      ('7+' != statusEmojiCount && streakCount >= 8)
    ) {
      setStatus(
        user.id,
        `I tried to cheat in Summer of Making because I’m a clown`,
        ':clown_face:'
      )
    }
  }

  if (github !== userRecord.id.github) {
    accountsTable.update(userRecord.id, {
      GitHub: github
    })
  }

  if (website !== userRecord.id.website) {
    accountsTable.update(userRecord.id, {
      Website: website
    })
  }
}
