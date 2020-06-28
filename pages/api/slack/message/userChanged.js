import {
  getUserRecord,
  setStatus,
  unverifiedRequest,
  accountsTable
} from '../../../../lib/api-utils'

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

  // While we're here, check if any of the user's profile fields have been changed & update them in Airtable

  const info = await fetch(
    `https://slack.com/api/users.info?token=${process.env.SLACK_BOT_TOKEN}&user=${user.id}`
  ).then(r => r.json())
  const tzOffset = info.user.tz_offset
  const tz = info.user.tz.replace(`\\`, '')

  const avatar = user.profile.image_192 // user from the event
  const github = user.profile.fields['Xf0DMHFDQA']?.value
  const website = user.profile.fields['Xf5LNGS86L']?.value

  if (github != userRecord.fields['GitHub']) {
    accountsTable.update(userRecord.id, {
      GitHub: github
    })
  }
  if (website != userRecord.fields['Website']) {
    accountsTable.update(userRecord.id, {
      Website: website
    })
  }
  accountsTable.update(userRecord.id, {
    Timezone: tz,
    'Timezone offset': tzOffset,
    Avatar: [
      {
        url: avatar
      }
    ]
  })
}
