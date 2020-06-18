import { getUserRecord, accountsTable, getUrlFromString, sendCommandResponse, t, postEphemeral, processGist } from "../../../../lib/api-utils"

export default async (req, res) => {
  const data = JSON.parse(req.body.payload)
  //console.log(data)
  const userId = data.user.id
  const responseUrl = data.response_url

  const parentMessage = await fetch(`https://slack.com/api/conversations.history?token=${process.env.SLACK_BOT_TOKEN}&channel=${data.channel.id}`).then(r => r.json())
  console.log('parentmessage', parentMessage)
  const text = parentMessage.messages[0].text
  console.log('text', text)
  let url = getUrlFromString(text)
  console.log(url)
  if (url.includes('gist.github.com')) {
    url = await processGist(url)
  }
  console.log(url)

  const userRecord = await getUserRecord(userId)
  await accountsTable.update(userRecord.id, {
    'CSS URL': url
  })
  await postEphemeral('C015M6U6JKU', t('messages.css.set', { url, username: userRecord.fields['Username'] }), userId, data.message.thread_ts)
}