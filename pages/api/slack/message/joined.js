/*
This posts an introductory message to the #scrapbook channel when someone shows up
*/
import { postEphemeral, timeout } from "../../../../lib/api-utils"

export default async (req, res) => {
  const { user, channel } = req.body.event

  await timeout(500)
  await postEphemeral(channel, `Welcome to the Summer Scrapbook, <@${user}>!
  To get started, post a photo or video of a project you're working on—it can be anything!
  Your update will be added to your personal scrapbook, which I'll share with you after your
  first post.`, user)

  return res.json({ ok: true })
}