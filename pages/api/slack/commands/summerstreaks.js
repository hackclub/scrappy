import {
  accountsTable,
  displayStreaks,
  getUserRecord,
  sendCommandResponse
} from '../../../../lib/api-utils'

export default async (req, res) => {
  console.log("Running summerstreaks.js")
  const userId = req.body.user_id
  const record = await getUserRecord(userId)
  const display = record.fields['Display Streak']
  await accountsTable.update(record.id, { 'Display Streak': !display })
  await sendCommandResponse(
    req.body.response_url,
    display
      ? `Your streak count is now invisible.`
      : `Your streak count is now visible!`
  )
  res.status(200).end()
  const streakCount = record.fields['Streak Count']
  await displayStreaks(userId, streakCount)
}
