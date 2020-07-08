import { unverifiedRequest, getPublicFileUrl, setAudio, getUserRecord, reply, t, rebuildScrapbookFor, accountsTable } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { files = [], channel, ts, user, text, thread_ts } = req.body.event
  if (thread_ts) return res.json({ ok: true })

  const urlPrivate = files[0].url_private
  const fileName = urlPrivate.split('/').pop()

  const acceptedFileTypes = ['mp3', 'wav', 'aiff', 'm4a']
  const containsAcceptedFileTypes = acceptedFileTypes.some((el) =>
    fileName.toLowerCase().endsWith(el)
  )
  if (!containsAcceptedFileTypes) {
    reply(channel, ts, t('messages.audio.notaccepted'))
    return res.status(200).end()
  }

  const userRecord = await getUserRecord(user)
  const publicUrl = await getPublicFileUrl(urlPrivate, channel, user)

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