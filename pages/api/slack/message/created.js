/*
This is triggered when a new post shows up in the #scrapbook channel

- posts without attachments should be rejected with an ephemeral message
- posts with attachments should be added to the scrapbook & replied to with a threaded message
*/

import {
  getPublicFileUrl,
  getUserRecord,
  reply,
  react,
  updatesTable,
  accountsTable,
  displayStreaks,
  getReplyMessage,
  fetchProfile,
  formatText,
  incrementStreakCount,
  postEphemeral,
  t,
  unverifiedRequest
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  const { files = [], channel, ts, user, text } = req.body.event

  let attachments = []
  let videos = []
  let videoPlaybackIds = []

  await Promise.all([
    react('add', channel, ts, 'beachball'),
    ...files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(file.url_private)
      if (!publicUrl) {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          reply(channel, ts, t('messages.errors.filetype')),
          react('add', channel, ts, 'x')
        ])
      }
      else if (publicUrl === 'heic') {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          reply(channel, ts, t('messages.errors.heic')),
          react('add', channel, ts, 'x')
        ])
      }
      console.log('public url', publicUrl)
      attachments.push({ url: publicUrl.url })
      if (publicUrl.muxId) {
        videos.push(publicUrl.muxId)
        videoPlaybackIds.push(publicUrl.muxPlaybackId)
      }
    })
  ])
  let userRecord = await getUserRecord(user)
  console.log(videos)
  console.log(attachments)
  console.log(userRecord)

  const date = new Date().toLocaleString("en-US", { timeZone: userRecord.fields['Timezone'] })
  const convertedDate = new Date(date).toISOString()
  console.log(convertedDate)

  await updatesTable.create({
    'Slack Account': [userRecord.id],
    'Post Time': convertedDate,
    'Message Timestamp': ts,
    Text: text,
    Attachments: attachments,
    'Mux Asset IDs': videos.toString(),
    'Mux Playback IDs': videoPlaybackIds.toString()
  })

  incrementStreakCount(user, channel, ts)

  return res.json({ ok: true })
}
