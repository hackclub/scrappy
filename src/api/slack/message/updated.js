/*
This message is called when a poster updates their previous post
*/
import {
  react,
  postEphemeral,
  
  getUserRecord,
  formatText,
  fetchProfile,
  unverifiedRequest
} from '../../../lib/api-utils'
import prisma from '../../../lib/prisma'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).json({ ok: true })

  const newMessage = await formatText(req.body.event.message.text)
  const prevTs = req.body.event.previous_message.ts
  const updateRecord = (
    await prisma.updates.findMany({
      where: {
        messageTimestamp: prevTs
      }
    })
  )[0]
  if (updateRecord) {
    await prisma.updates.update({
      where: { id: updateRecord.id },
      data: { text: newMessage }
    })
    await postEphemeral(
      req.body.event.channel,
      `Your post has been edited! You should see it update on the website in a few seconds.`,
      req.body.event.message.user
    )
    const userRecord = await getUserRecord(req.body.event.message.user)
    fetchProfile(userRecord.username)
  }
}
