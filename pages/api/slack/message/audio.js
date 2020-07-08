import { unverifiedRequest, getPublicFileUrl, setAudio, getUserRecord, reply, t, rebuildScrapbookFor, accountsTable } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { files = [], channel, ts, user, text, thread_ts } = req.body.event
  if (thread_ts) return res.json({ ok: true })

  const userRecord = await getUserRecord(user)

  const publicUrl = await getPublicFileUrl(files[0].url_private, channel, user)

  await Promise.all([
    accountsTable.update(userRecord.id, {
      'Audio File': [
        {
          'url': publicUrl.url
        }
      ],
      'Custom Audio URL': ''
    }),
    reply(channel, ts, t('messages.audio.set', { url: `https://scrapbook.hackclub.com/${userRecord.fields['Username']}` })),
    rebuildScrapbookFor(user)
  ])
}