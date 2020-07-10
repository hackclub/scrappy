import { unverifiedRequest, getEmojiRecord, updatesTable, reactionsTable, getUserRecord, getReactionRecord, updateExists, emojiExists } from "../../../../lib/api-utils"
import Bottleneck from 'bottleneck'

const limiter = new Bottleneck({
  maxConcurrent: 1
})

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()
  //console.log(req.body)
  const { item, user, reaction } = req.body.event
  console.log(item, user, reaction)

  if (reaction !== 'summer-of-making' && user === 'U015D6A36AG') return

  /*const blacklist = ['rocket', 'clap', 'fire', 'party-dinosaur', 'sparkles', 'parrot', 'yay', 'exploding_head', 'sauropod', 'tada', 'zap', 'summer-of-making', 'beachball']
  if (blacklist.includes(reaction)) {
    console.log('not including default emoji')
    return
  }*/
  const startTS = Date.now()
  limiter.schedule(async () => {
    console.log(startTS, 'Starting a reaction update')
    const emojiRecord = await getEmojiRecord(reaction)
    const userRecord = await getUserRecord(user)

    const ts = item.ts
    const update = (await updatesTable.read({
      maxRecords: 1,
      filterByFormula: `{Message Timestamp} = '${ts}'`
    }))[0]
    if (!update) {
      console.log(startTS, 'reaction was added to a message in a thread. skipping...')
      return
    }

    const postExists = await updateExists(update.fields['ID'])
    const reactionExists = await emojiExists(reaction, update.fields['ID'])

    if (!reactionExists) {
      // Post hasn't been reacted to yet at all, or it has been reacted to, but not with this emoji
      console.log(startTS, `Post hasn't been reacted to at all, or it has been reacted to, but not with this emoji`)
      await reactionsTable.create({
        'Update': [update.id],
        'Updates': [update.id],
        'Emoji': [emojiRecord.id],
        'Users Reacted': [userRecord.id]
      })
    } else if (postExists && reactionExists) {
      // Post has been reacted to with this emoji
      console.log(startTS, 'Post has been reacted to with this emoji')
      const reactionRecord = await getReactionRecord(reaction, update.fields['ID'])
      let usersReacted = reactionRecord.fields['Users Reacted']
      console.log(startTS, 'adding reaction')
      await usersReacted.push(userRecord.id)
      await reactionsTable.update(reactionRecord.id, {
        'Users Reacted': usersReacted
      })
      console.log(startTS, 'added reaction!')
    }
    console.log(startTS, 'Finished update that took', Date.now() - startTS, 'ms')
  })
}