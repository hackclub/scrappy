import {
  unverifiedRequest,
  getReactionRecord,
  getUserRecord
} from '../../../lib/api-utils'
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
      await prisma.updates.findMany({
        where: {
          messageTimestamp: ts
        }
      })
    )[0]
    if (!update) {
      console.log(
        startTS,
        'reaction was removed from a message in a thread. skipping...'
      )
      return
    }
    //console.log('reaction_removed: update record', update)
    const reactionRecord = await getReactionRecord(
      reaction,
      update.id
    )

    let usersReacted = reactionRecord.usersReacted
    const updatedUsersReacted = usersReacted.filter(
      (userReacted) => userReacted != userRecord.id
    )

    console.log(startTS, 'removing reaction...')
    if (updatedUsersReacted.length === 0) {
      console.log(
        startTS,
        'i deleted the reaction record because that was the only reaction!'
      )
      await prisma.emojireactions.deleteMany({
        where: {
          id: reactionRecord.id
        }
      })
    } else {
      console.log(startTS, 'there have been multiple reactions, removing...')
      await prisma.emojireactions.update({
        where: { id: reactionRecord.id },
        data: { usersReacted: updatedUsersReacted }
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
