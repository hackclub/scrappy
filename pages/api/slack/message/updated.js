/*
This message is called when a poster updates their previous post
*/
const { react, postEphemeral, updatesTable, getUserRecord, replaceEmoji, fetchProfile, unverifiedRequest } = require("../../../../lib/api-utils")

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const newMessage = await replaceEmoji(req.body.event.message.text)
  const prevTs = req.body.event.previous_message.ts

  await react('add', req.body.event.channel, prevTs, 'beachball')

  const updateRecord = (await updatesTable.read({
    maxRecords: 1,
    filterByFormula: `{Message Timestamp} = '${prevTs}'`
  }))[0]
  await updatesTable.update(updateRecord.id, {
    'Text': newMessage
  })
  await Promise.all([
    react('remove', req.body.event.channel, prevTs, 'beachball'),
    postEphemeral(req.body.event.channel, `Your update has been edited! You should see it update on the website in a few seconds.`, req.body.event.message.user)
  ])
  const userRecord = await getUserRecord(req.body.event.user)
  fetchProfile(userRecord.fields['Username'])

  res.status(200).json({ ok: true })
}
