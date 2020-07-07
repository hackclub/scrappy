import { unverifiedRequest, getEmojiRecord } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  const { item, user, reaction } = req.body

  const emojiRecord = await getEmojiRecord(reaction)
}