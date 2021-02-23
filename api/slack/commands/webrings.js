const {
  unverifiedRequest,
  getUserRecord,
  accountsTable,
  sendCommandResponse,
  t,
  fetchProfile
} = require('../../../../lib/api-utils'

module.exports = async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user_id, response_url, text } = req.body
  const args = text.split(' ')
  const webringUser = args[args[0] === 'webring' ? 1 : 0]
    ?.split('@')[1]
    ?.split('|')[0]
  console.log('webring user', webringUser)

  if (!webringUser) {
    return sendCommandResponse(response_url, t('messages.webring.noargs'))
  }
  if (webringUser && !text.includes('<@')) {
    return sendCommandResponse(response_url, t('messages.open.invaliduser'))
  }
  if (user_id === webringUser) {
    return sendCommandResponse(response_url, t('messages.webring.yourself'))
  }

  const userRecord = await getUserRecord(user_id)
  const webringUserRecord = await getUserRecord(webringUser)
  const scrapbookLink = userRecord.fields['Scrapbook URL']
  let currentWebring = userRecord.fields['Webring']
  console.log('current webrings', currentWebring)
  if (!currentWebring) {
    currentWebring = [webringUserRecord.id]
  } else if (!currentWebring.includes(webringUserRecord.id)) {
    if (currentWebring.length >= 8)
      return sendCommandResponse(response_url, t('messages.webring.toolong'))
    currentWebring.push(webringUserRecord.id)
    sendCommandResponse(
      response_url,
      t(`messages.webring.add`, { webringUser, scrapbookLink })
    )
  } else {
    currentWebring = currentWebring.filter((rec) => rec != webringUserRecord.id)
    sendCommandResponse(
      response_url,
      t(`messages.webring.remove`, { webringUser, scrapbookLink })
    )
  }
  await accountsTable.update(userRecord.id, { Webring: currentWebring })
  await fetchProfile(userRecord.fields['Username'])
}
