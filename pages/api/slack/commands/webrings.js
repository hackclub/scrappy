import { unverifiedRequest, getUserRecord, accountsTable, sendCommandResponse, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user_id, response_url, text } = req.body
  console.log('webring text', text)
  const action = text.split(' ')[1]
  const webringUser = text.split(' ')[2]?.split('@')[1].split('|')[0]
  console.log('webring user', webringUser)

  if (!action || !webringUser) {
    return sendCommandResponse(response_url, t('messages.webrings.noargs'))
  }

  let userRecord
  try {
    userRecord = await getUserRecord(user_id)
  } catch {
    return sendCommandResponse(response_url, t('messages.webrings.invaliduser'))
  }
  const webringUserRecord = await getUserRecord(webringUser)
  let currentWebrings = userRecord.fields['Webring']
  console.log('current webrings', currentWebrings)
  if (!currentWebrings) {
    currentWebrings = [webringUserRecord.id]
  } else {
    if (action === 'add') {
      if (currentWebrings.includes(webringUserRecord.id)) {
        return sendCommandResponse(response_url, t('messages.webrings.alreadyadded', { webringUser }))
      }
      currentWebrings.push(webringUserRecord.id)
    } else if (action === 'remove') {
      const newWebrings = currentWebrings.filter(rec => rec != webringUserRecord.id)
      if (newWebrings == currentWebrings) {
        return sendCommandResponse(response_url, t('messages.webrings.alreadyremoved', { webringUser }))
      }
    } else {
      return sendCommandResponse(response_url, t('messages.webrings.invalidaction'))
    }
    console.log('new webrings', currentWebrings)
  }
  await Promise.all([
    accountsTable.update(userRecord.id, { 'Webring': currentWebrings }),
    sendCommandResponse(response_url, t(`messages.webrings.${action}`, { webringUser }))
  ])
}