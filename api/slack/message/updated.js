/*
This message is called when a poster updates their previous post
*/
const {
  react,
  postEphemeral,
  updatesTable,
  getUserRecord,
  formatText,
  fetchProfile,
  unverifiedRequest
} = require('../../../../lib/api-utils')

module.exports = async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).json({ ok: true })

  const newMessage = await formatText(req.body.event.message.text)
  const prevTs = req.body.event.previous_message.ts

  const updateRecord = (
    await updatesTable.read({
      maxRecords: 1,
      filterByFormula: `{Message Timestamp} = '${prevTs}'`
    })
  )[0]
  if (updateRecord) {
    await updatesTable.update(updateRecord.id, { Text: newMessage })
    await postEphemeral(
      req.body.event.channel,
      `Your post has been edited! You should see it update on the website in a few seconds.`,
      req.body.event.message.user
    )
    const userRecord = await getUserRecord(req.body.event.message.user)
    fetchProfile(userRecord.fields['Username'])
  }
}
