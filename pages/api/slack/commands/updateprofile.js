import { unverifiedRequest, getUserRecord, sendCommandResponse, accountsTable, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user_id, response_url } = req.body

  const userRecord = await getUserRecord(user_id)

  const user = await fetch(
    `https://slack.com/api/users.info?token=${process.env.SLACK_BOT_TOKEN}&user=${user_id}`
  ).then((r) => r.json())
  console.log(user)
  const tzOffset = user.user.tz_offset
  const tz = user.user.tz.replace(`\\`, '')
  const profile = await fetch(
    `https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`
  ).then((r) => r.json())
  const avatar = profile.profile.image_192
  const github = profile.profile.fields['Xf0DMHFDQA']?.value
  const website = profile.profile.fields['Xf5LNGS86L']?.value

  accountsTable.update(userRecord.id, {
    Website: website,
    GitHub: github,
    Avatar: [
      {
        url: avatar
      }
    ],
    'Timezone offset': tzOffset,
    Timezone: tz
  })
  sendCommandResponse(response_url, t('messages.profileUpdate', { scrapbookLink: `https://scrapbook.hackclub.com/${userRecord.fields['Username']}` }))
  await fetchProfile(userRecord.fields['Username'])
}