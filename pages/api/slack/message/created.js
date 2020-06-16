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
  incrementStreakCount
} from '../../../../lib/api-utils'

export default async (req, res) => {
  const { files = [], channel, ts, user, text } = req.body.event
  console.log(req.body.event)

  //const formattedText = await formatText(text)
  //console.log(formattedText)

  let attachments = []
  let videos = []
  let videoPlaybackIds = []

  await Promise.all([
    react('add', channel, ts, 'beachball'),
    ...files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(file.url_private)
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

  await updatesTable.create({
    'Slack Account': [userRecord.id],
    'Post Time': new Date().toUTCString(),
    'Message Timestamp': ts,
    Text: formattedText,
    Attachments: attachments,
    'Mux Asset IDs': videos.toString(),
    'Mux Playback IDs': videoPlaybackIds.toString()
  })

  incrementStreakCount(user)

  await displayStreaks(user, updatedStreakCount)
  fetchProfile(userRecord.fields['Username'])

  const updatedUserRecord = await getUserRecord(user)
  const replyMessage = getReplyMessage(
    user,
    userRecord.fields['Username'],
    updatedStreakCount,
    updatedUserRecord.fields['New Member']
  )

  // remove beachball react, add final summer-of-making react
  await Promise.all([
    react('remove', channel, ts, 'beachball'),
    react('add', channel, ts, 'summer-of-making'),
    reply(channel, ts, replyMessage)
  ])

  return res.json({ ok: true })
}
