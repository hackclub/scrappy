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
  
  displayStreaks,
  getReplyMessage,
  fetchProfile,
  formatText,
  incrementStreakCount,
  postEphemeral,
  t,
  unverifiedRequest,
  isFullMember,
  createPost
} from '../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()
  const { files = [], channel, ts, user, text, thread_ts } = req.body.event

  if (thread_ts) return res.json({ ok: true })

  await createPost(files, channel, ts, user, text)

  return res.json({ ok: true })
}
