import {
  unverifiedRequest,
  getUserRecord,
  t,
  accountsTable,
  sendCommandResponse,
  rebuildScrapbookFor
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { text, user_id, response_url } = req.body
  const args = text.split(' ')
  let username = args[0] === 'setusername' ? args[1] : args[0]
  username = username?.replace(' ', '_')

  const userRecord = await getUserRecord(user_id)

  const exists = await fetch(
    `https://airbridge.hackclub.com/v0.1/Summer%20of%20Making%20Streaks/Slack%20Accounts?select=${JSON.stringify(
      {
        maxRecords: 1,
        filterByFormula: `{Username} = "${username}"`
      }
    )}`
  ).then((r) => r.json())

  console.log(exists.length)

  if (
    userRecord.fields['Last Username Updated Time'] >
    new Date(Date.now() - 86400 * 1000).toISOString()
  ) {
    sendCommandResponse(response_url, t('messages.username.time'))
  } else if (!username) {
    sendCommandResponse(response_url, t('messages.username.noargs'))
  } else if (username.length < 3) {
    sendCommandResponse(response_url, t('messages.username.short'))
  } else if (exists.length > 0) {
    sendCommandResponse(response_url, t('messages.username.exists'))
  } else {
    // update the account with the new username
    await accountsTable.update(userRecord.id, {
      Username: username,
      'Last Username Updated Time': Date.now()
    })

    // force a rebuild of their site
    await rebuildScrapbookFor(user_id)

    // hang tight while the rebuild happens before giving out the new link
    await sendCommandResponse(
      response_url,
      t('messages.username.set', {
        url: `https://scrapbook.hackclub.com/${username}`
      })
    )
  }
  res.status(200).end()
}
