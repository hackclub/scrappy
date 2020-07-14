import { unverifiedRequest, getUserRecord, accountsTable, sendCommandResponse, t, fetchProfile } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user_id, response_url, text } = req.body
  const args = text.split(' ')
  const action = args[0] === 'webring' ? args[1] : args[0]
  const webringUser = text.split(' ')[args[0] === 'webring' ? 2 : 1]?.split('@')[1].split('|')[0]
  console.log('webring user', webringUser)

  if (!action || !webringUser) {
    return sendCommandResponse(response_url, t('messages.webring.noargs'))
  }

  let userRecord
  try {
    userRecord = await getUserRecord(user_id)
  } catch {
    return sendCommandResponse(response_url, t('messages.webring.invaliduser'))
  }
  const webringUserRecord = await getUserRecord(webringUser)
  let currentWebring = userRecord.fields['Webring']
  console.log('current webrings', currentWebring)
  if (!currentWebring) {
    currentWebring = [webringUserRecord.id]
  } else {
    if (action === 'add') {
      if (currentWebring.includes(webringUserRecord.id)) {
        return sendCommandResponse(response_url, t('messages.webring.alreadyadded', { webringUser }))
      }
      currentWebring.push(webringUserRecord.id)
    } else if (action === 'remove') {
      const newWebring = currentWebring.filter(rec => rec != webringUserRecord.id)
      if (JSON.stringify(newWebring) === JSON.stringify(currentWebring)) {
        return sendCommandResponse(response_url, t('messages.webring.alreadyremoved', { webringUser }))
      }
      else currentWebring = newWebring
    } else {
      return sendCommandResponse(response_url, t('messages.webring.invalidaction'))
    }
    console.log('new webrings', currentWebring)
  }
  await Promise.all([
    accountsTable.update(userRecord.id, { 'Webring': currentWebring }),
    sendCommandResponse(response_url, t(`messages.webring.${action}`, { webringUser }))
  ])
  await fetchProfile(userRecord.fields['Username'])
}