import { unverifiedRequest, sendCommandResponse, getUserRecord, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { text, user_id, response_url } = req.body
  console.log('Scrapbook open:', text)
  const args = text.split(' ')
  const userArg = text.split(' ')[args[0] === 'open' ? 2 : 1]?.split('@')[1].split('|')[0]
  if (userArg && !user.includes('<@')) {
    return sendCommandResponse(response_url, t('messages.open.invaliduser'))
  }
  const userRecord = await getUserRecord(userArg || user_id)
  const scrapbookLink = userRecord.fields['Scrapbook Link']
  if (userArg) {
    sendCommandResponse(response_url, t('messages.open.userArg', { scrapbookLink, userArg }))
  } else {
    sendCommandResponse(response_url, t('messages.open.self', { scrapbookLink }))
  }
}