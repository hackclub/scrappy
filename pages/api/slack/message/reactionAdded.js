import {
  unverifiedRequest,
  getEmojiRecord,
  updatesTable,
  reactionsTable,
  getUserRecord,
  getReactionRecord,
  updateExists,
  emojiExists,
  react,
  getMessage,
  t,
  getPublicFileUrl,
  incrementStreakCount,
  formatText,
  isFullMember,
  createPost
} from '../../../../lib/api-utils'
import Bottleneck from 'bottleneck'
import { WebClient } from '@slack/web-api'

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

const limiter = new Bottleneck({ maxConcurrent: 1 })

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  } else {
    res.status(200).end()
  }
  const { item, user, reaction, item_user } = req.body.event
  console.log(item, user, reaction)

  const { channel, ts } = item

  if (reaction !== 'summer-of-making' && user === 'U015D6A36AG') return

  // If someone reacted with a Scrappy emoji in a non-#scrapbook channel, then maybe upload it.
  if (
    (reaction === 'scrappy' || reaction === 'scrappyparrot') &&
    channel !== process.env.CHANNEL
  ) {
    if (item_user != user) {
      // If the reacter didn't post the original message, then show them a friendly message
      slack.chat.postEphemeral({
        channel,
        user,
        text: `Sorry, but only the original message poster can react with :${reaction}: to upload to Scrapbook.`
      })
    } else {
      const message = await getMessage(ts, channel)

      if (!message) return

      if (!message.files || message.files.length == 0) {
        slack.chat.postEphemeral({
          channel,
          user,
          text: `Hmm... :thinking_face: I don't detect any files in this message.`
        })
        return
      }
      await createPost(message.files, channel, ts, user, message.text)
    }
    return
  }

  const startTS = Date.now()
  limiter.schedule(async () => {
    console.log(startTS, 'Starting a reaction update')
    const emojiRecord = await getEmojiRecord(reaction)
    const userRecord = await getUserRecord(user).catch((err) =>
      console.log('Cannot get user record', err)
    )

    const { ts } = item
    const update = (
      await updatesTable
        .read({
          maxRecords: 1,
          filterByFormula: `{Message Timestamp} = '${ts}'`
        })
        .catch((err) => console.log('Cannot get update', err))
    )[0]
    if (!update) {
      console.log(
        startTS,
        'reaction was added to a message in a thread. skipping...'
      )
      return
    }

    const postExists = await updateExists(update.fields['ID'])
    const reactionExists = await emojiExists(reaction, update.fields['ID'])

    if (!reactionExists) {
      // Post hasn't been reacted to yet at all, or it has been reacted to, but not with this emoji
      console.log(
        startTS,
        `Post hasn't been reacted to at all, or it has been reacted to, but not with this emoji`
      )
      await reactionsTable.create({
        Update: [update.id],
        Emoji: [emojiRecord.id],
        'Users Reacted': [userRecord.id]
      })
    } else if (postExists && reactionExists) {
      // Post has been reacted to with this emoji
      console.log(startTS, 'Post has been reacted to with this emoji')
      const reactionRecord = await getReactionRecord(
        reaction,
        update.fields['ID']
      ).catch((err) => console.log('Cannot get reaction record', err))
      let usersReacted = reactionRecord.fields['Users Reacted']
      console.log(startTS, 'adding reaction')
      await usersReacted.push(userRecord.id)
      await reactionsTable.update(reactionRecord.id, {
        'Users Reacted': usersReacted
      })
      console.log(startTS, 'added reaction!')
    }
    console.log(
      startTS,
      'Finished update that took',
      Date.now() - startTS,
      'ms'
    )
  })
}
