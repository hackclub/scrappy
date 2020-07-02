import { unverifiedRequest, getUserRecord, accountsTable, sendCommandResponse, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user_id, response_url, text } = req.body
  const webringUser = text.split(' ')[1]
  if (!webringUser) {
    return sendCommandResponse(response_url, t('messages.webrings.noargs'))
  }

  let userRecord
  try {
    userRecord = await getUserRecord(user_id)
  } catch {
    return sendCommandResponse(response_url, t('messages.webrings.invaliduser'))
  }
  const webringUserRecord = await getUserRecord(webringUser)
  let currentWebrings = userRecord.fields['Webrings']

  currentWebrings = currentWebrings.push(webringUserRecord.id)
  await Promise.all([
    accountsTable.update(userRecord.id, { 'Webrings': currentWebrings }),
    sendCommandResponse(response_url, t('messages.webrings.set'), { webringUser })
  ])
}