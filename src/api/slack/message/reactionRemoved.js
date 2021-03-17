import {
  unverifiedRequest,
  getReactionRecord,
  reactionsTable,
  updatesTable,
  getUserRecord
} from '@lib/api-utils'
import Bottleneck from 'bottleneck'

const limiter = new Bottleneck({
  maxConcurrent: 1
})

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { item, user, reaction } = req.body.event
  const ts = item.ts

  const startTS = Date.now()
  limiter.schedule(async () => {
    const userRecord = await getUserRecord(user)
    const update = (
      await updatesTable.read({
        maxRecords: 1,
        filterByFormula: `{Message Timestamp} = '${ts}'`
      })
    )[0]
    //console.log('reaction_removed: update record', update)
    const reactionRecord = await getReactionRecord(
      reaction,
      update.fields['ID']
    )

    let usersReacted = reactionRecord.fields['Users Reacted']
    const updatedUsersReacted = usersReacted.filter(
      (userReacted) => userReacted != userRecord.id
    )

    console.log(startTS, 'removing reaction...')
    if (updatedUsersReacted.length === 0) {
      console.log(
        startTS,
        'i deleted the reaction record because that was the only reaction!'
      )
      await reactionsTable.delete(reactionRecord.id)
    } else {
      console.log(startTS, 'there have been multiple reactions, removing...')
      await reactionsTable.update(reactionRecord.id, {
        'Users Reacted': updatedUsersReacted
      })
    }
    console.log(
      startTS,
      'Finished removing reaction, took',
      Date.now() - startTS,
      'ms'
    )
  })
}
