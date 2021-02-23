const {
  unverifiedRequest,
  sendCommandResponse,
  getUserRecord,
  t
} = require('../../lib/api-utils')

module.exports = async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { text, user_id, response_url } = req.body
  console.log('Scrapbook open:', text)
  const args = text?.split(' ')
  const userArg = args[args[0] === 'open' ? 1 : 0]?.split('@')[1]?.split('|')[0]
  console.log('user arg', userArg)
  if (userArg && !text.includes('<@')) {
    return sendCommandResponse(response_url, t('messages.open.invaliduser'))
  }
  const userRecord = await getUserRecord(userArg || user_id)
  console.log(
    'found user record for ',
    userArg || user_id,
    userRecord.fields['Scrapbook URL']
  )
  const scrapbookLink = userRecord.fields['Scrapbook URL']
  if (userArg) {
    sendCommandResponse(
      response_url,
      t('messages.open.userArg', { scrapbookLink, userArg })
    )
  } else {
    sendCommandResponse(
      response_url,
      t('messages.open.self', { scrapbookLink })
    )
  }
}
