/*
This is triggered when a new post shows up in the #scrapbook channel

- posts without attachments should be rejected with an ephemeral message
- posts with attachments should be added to the scrapbook & replied to with a threaded message
*/

import { getPublicFileUrl, getUserRecord, reply, react, updatesTable, accountsTable, displayStreaks, getReplyMessage } from "../../../../lib/api-utils"

export default async (req, res) => {
  const { files = [], channel, ts, user, text } = req.body.event

  await react('add', channel, ts, 'beachball')

  let attachments = []
  let videos = []
  let videoPlaybackIds = []

  await Promise.all(
    files.map(async file => {
      const publicUrl = await getPublicFileUrl(file.url_private)
      attachments.push({ url: publicUrl.url })
      if (publicUrl.muxId) {
        videos.push(publicUrl.muxId)
        videoPlaybackIds.push(publicUrl.muxPlaybackId)
      }
    })
  )

  const userRecord = await getUserRecord(user)
  await updatesTable.create({
    'Slack Account': [userRecord.id],
    'Post Time': new Date().toUTCString(),
    'Message Timestamp': ts,
    Text: text,
    Attachments: attachments,
    'Mux Asset IDs': videos.toString(),
    'Mux Playback IDs': videoPlaybackIds.toString()
  })

  const record = await getUserRecord(user)
  const updatedStreakCount = record.fields['Streak Count'] + 1

  await accountsTable.update(record.id, {
    'Streak Count': updatedStreakCount
  })

  await displayStreaks(user, updatedStreakCount)

  // remove beachball react, add final summer-of-making react
  await Promise.all([
    react('remove', channel, ts, 'beachball'),
    react('add', channel, ts, 'summer-of-making')
  ])

  const updatedRecord = await getUserRecord(user)
  const replyMessage = await getReplyMessage(user, updatedRecord.fields['Username'], updatedRecord.fields['Streak Count'])
  await reply(channel, ts, replyMessage)

  return res.json({ ok: true })
}