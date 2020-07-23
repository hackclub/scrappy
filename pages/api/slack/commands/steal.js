import {
  unverifiedRequest,
  getUserRecord,
  accountsTable,
  sendCommandResponse,
  t
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user_id, response_url, text } = req.body
  console.log('victim text', text)
  const args = text.split(' ')
  const victimUser = args[args[0] === 'webring' ? 1 : 0]
    ?.split('@')[1]
    ?.split('|')[0]
  console.log('victim user', victimUser)

  if (!victimUser) {
    return sendCommandResponse(response_url, t('messages.steal.noargs'))
  }

  let userRecord
  try {
    userRecord = await getUserRecord(user_id)
  } catch {
    return sendCommandResponse(response_url, t('messages.steal.invaliduser'))
  }
  const victimUserRecord = await getUserRecord(victimUser)
  const newCSS = victimUserRecord.fields['CSS URL']

  if ((newCSS === '')) return sendCommandResponse(response_url, t(`messages.steal.empty`, { victimUser }))

  await Promise.all([
    accountsTable.update(userRecord.id, { 'CSS URL': newCSS }),
    sendCommandResponse(response_url, t(`messages.steal.done`, { victimUser }))
  ])
}
