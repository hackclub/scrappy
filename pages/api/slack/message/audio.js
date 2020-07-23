/*
  This is triggered when a new post shows up in the #scrapbook-sounds channel
*/

import {
  unverifiedRequest,
  getPublicFileUrl,
  getUserRecord,
  reply,
  t,
  rebuildScrapbookFor,
  accountsTable,
  react
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { files = [], channel, ts, user, text, thread_ts } = req.body.event
  if (thread_ts) return res.json({ ok: true })

  // Start a loading indicator
  await react('add', channel, ts, 'beachball')

  const urlPrivate = files[0].url_private
  const fileName = urlPrivate.split('/').pop()

  const acceptedFileTypes = ['mp3', 'wav', 'aiff', 'm4a']
  const containsAcceptedFileTypes = acceptedFileTypes.some((el) =>
    fileName.toLowerCase().endsWith(el)
  )
  if (!containsAcceptedFileTypes) {
    await Promise.all([
      react('remove', channel, ts, 'beachball'),
      react('add', channel, ts, 'no_entry'),
      reply(channel, ts, t('messages.audio.notaccepted'))
    ])
    return res.status(200).end()
  }

  const userRecord = await getUserRecord(user)
  const publicUrl = await getPublicFileUrl(urlPrivate, channel, user)

  await accountsTable.update(userRecord.id, {
    'Audio File': [
      {
        url: publicUrl.url
      }
    ],
    'Custom Audio URL': ''
  })
  await rebuildScrapbookFor(userRecord)

  await Promise.all([
    react('remove', channel, ts, 'beachball'),
    react('add', channel, ts, t('messages.audio.emoji.accepted')),
    reply(
      channel,
      ts,
      t('messages.audio.set', {
        url: `https://scrapbook.hackclub.com/${userRecord.fields['Username']}`
      })
    )
  ])
  await react('add', channel, ts, t('audio.emoji.success'))
}
