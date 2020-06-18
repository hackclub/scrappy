import { getUserRecord, accountsTable, getUrlFromString, sendCommandResponse, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  const data = JSON.parse(req.body.payload)
  console.log(data)
  const userId = data.user.id
  const responseUrl = data.response_url

  const parentMessage = await fetch(`https://slack.com/api/conversations.history?token=${process.env.SLACK_BOT_TOKEN}&channel=${data.channel.id}&latest=${data.message.thread_ts}&limit=1`).then(r => r.json())
  console.log('parentmessage', parentMessage)
  const text = parentMessage.messages[0].text
  console.log('text', text)
  const url = getUrlFromString(text)

  const userRecord = await getUserRecord(userId)
  accountsTable.update(userRecord.id, {
    'CSS URL': url
  })
  sendCommandResponse(responseUrl, t('messages.css.set', { url }))
}