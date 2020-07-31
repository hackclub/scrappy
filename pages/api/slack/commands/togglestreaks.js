import {
  accountsTable,
  displayStreaks,
  getUserRecord,
  sendCommandResponse,
  unverifiedRequest,
  t
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()
  console.log('Running togglestreaks.js')

  // /scrappy-togglestreaks: toggle status
  // /scrappy-togglestreaks all: opt out of streaks completely

  const { user_id, response_url, text } = req.body
  const args = text?.split(' ')
  const allArg = args[args[0] === 'togglestreaks' ? 1 : 0]
  const toggleAllStreaks = allArg && allArg === 'all'
  const record = await getUserRecord(user_id)
  const display = record.fields['Display Streak']
  const streaksToggledOff = record.fields['Streaks Toggled Off']

  if (toggleAllStreaks) {
    await Promise.all([
      accountsTable.update(record.id, {
        'Display Streak': streaksToggledOff ? true : false,
        'Streaks Toggled Off': !streaksToggledOff
      }),
      sendCommandResponse(
        response_url,
        streaksToggledOff
          ? t('messages.streak.toggle.all.optin')
          : t('messages.streak.toggle.all.optout')
      )
    ])
  } else {
    await Promise.all([
      accountsTable.update(record.id, {
        'Display Streak': !display
      }),
      sendCommandResponse(
        response_url,
        display
          ? t('messages.streak.toggle.status.invisible')
          : t('messages.streak.toggle.status.visible')
      )
    ])
  }
  await displayStreaks(user_id, record.fields['Streak Count'])
}
