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
  replaceEmoji,
  updatesTable,
  accountsTable,
  displayStreaks,
  getReplyMessage,
  fetchProfile,
  formatText,
  incrementStreakCount,
  postEphemeral,
  t,
  unverifiedRequest,
  isFullMember
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()
  const { files = [], channel, ts, user, text, thread_ts } = req.body.event

  if (thread_ts) return res.json({ ok: true })

  let attachments = []
  let videos = []
  let videoPlaybackIds = []

  await Promise.all([
    react('add', channel, ts, 'beachball'),
    ...files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(file.url_private, channel, user)
      if (!publicUrl) {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          reply(channel, ts, t('messages.errors.filetype')),
          react('add', channel, ts, 'x')
        ])
      }
      else if (publicUrl.url === 'heic') {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          reply(channel, ts, t('messages.errors.heic')),
          react('add', channel, ts, 'x')
        ])
      }
      else if (publicUrl.url === 'big boy') {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          reply(channel, ts, t('messages.errors.bigimage')),
          react('add', channel, ts, 'x')
        ])
      }
      console.log('public url', publicUrl.url)
      attachments.push({ url: publicUrl.url })
      if (publicUrl.muxId) {
        videos.push(publicUrl.muxId)
        videoPlaybackIds.push(publicUrl.muxPlaybackId)
      }
    })
  ])
  let userRecord = await getUserRecord(user)
  const fullSlackMember = userRecord.fields['Full Slack Member?']
  if (!fullSlackMember) {
    const fullMember = await isFullMember(user)
    console.log('is full member', fullMember)
    if (fullMember) {
      accountsTable.update(userRecord.id, { 'Full Slack Member?': true })
    }
  }

  const date = new Date().toLocaleString("en-US", { timeZone: userRecord.fields['Timezone'] })
  const convertedDate = new Date(date).toISOString()
  const message = await formatText(text)
  console.log(convertedDate)

  await updatesTable.create({
    'Slack Account': [userRecord.id],
    'Post Time': convertedDate,
    'Message Timestamp': ts,
    Text: message,
    Attachments: attachments,
    'Mux Asset IDs': videos.toString(),
    'Mux Playback IDs': videoPlaybackIds.toString(),
    'Is Large Video': attachments.some(attachment => attachment.url === 'https://i.imgur.com/UkXMexG.mp4')
  })

  incrementStreakCount(user, channel, ts)

  return res.json({ ok: true })
}
