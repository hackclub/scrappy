import { unverifiedRequest, getReactionRecord, reactionsTable, updatesTable, getUserRecord } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { item, user, reaction } = req.body.event
  const ts = item.ts

  const userRecord = await getUserRecord(user)
  const update = (await updatesTable.read({
    maxRecords: 1,
    filterByFormula: `{Message Timestamp} = '${ts}'`
  }))[0]
  //console.log('reaction_removed: update record', update)
  const reactionRecord = await getReactionRecord(reaction, update.fields['ID'])

  let usersReacted = reactionRecord.fields['Users Reacted']
  const updatedUsersReacted = usersReacted.filter(userReacted => userReacted != userRecord.id)

  if (updatedUsersReacted.length === 0) {
    await reactionsTable.delete(reactionRecord.id)
  } else {
    await reactionsTable.update(reactionRecord.id, {
      'Users Reacted': updatedUsersReacted
    })
  }
}