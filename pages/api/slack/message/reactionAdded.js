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
  updateExistsTS,
  getPublicFileUrl,
  incrementStreakCount,
  formatText,
  isFullMember,
  createPost,
  postEphemeral
} from '../../../../lib/api-utils'
import Bottleneck from 'bottleneck'

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

  if (reaction !== 'wom' && user === 'U015D6A36AG') return

  if (await updateExistsTS(ts) && (reaction === 'scrappy' || reaction === 'scrappyparrot') &&
    channel !== process.env.CHANNEL) return
  
  if (await updateExistsTS(ts) && (reaction === 'scrappy-retry')){
    try { fetch(userRecord.fields['Webhook URL']) }
    catch (err) { }
    const message = await getMessage(ts, channel)
    const channelKeywords = require('../../../../lib/channelKeywords.json')
    if (typeof channelKeywords[channel] !== 'undefined') await react('add', channel, ts, channelKeywords[channel])
    const emojiKeywords = require('../../../../lib/emojiKeywords.json')
    console.log('emoji keywords', emojiKeywords)
    Object.keys(emojiKeywords).forEach(async (keyword) => {
      if (
        message
          .text
          .toLowerCase()
          .search(new RegExp('\\b' + keyword + '\\b', 'gi')) !== -1
      ) {
        await react('add', channel, ts, emojiKeywords[keyword])
      }
    })
    await react('remove', channel, ts, 'beachball')
    await react('add', channel, ts, 'wom')
    return
  }

  // If someone reacted with a Scrappy emoji in a non-#scrapbook channel, then maybe upload it.
  if (
    (reaction === 'scrappy' || reaction === 'scrappyparrot') &&
    channel !== process.env.CHANNEL
  ) {
    if (item_user != user) {
      // If the reacter didn't post the original message, then show them a friendly message
      postEphemeral(channel, t('messages.errors.anywhere.op', { reaction }), user)
    } else {
      const message = await getMessage(ts, channel)

      if (!message) return

      if (!message.files || message.files.length == 0) {
        postEphemeral(channel, t('messages.errors.anywhere.files'), user)
        return
      }
      await createPost(message.files, channel, ts, user, message.text)
    }
    return
  }
  
  if (
    (reaction === 'scrappy-retry') &&
    channel == process.env.CHANNEL
  ) {
    const message = await getMessage(ts, channel)

    if (!message) return

    if (!message.files || message.files.length == 0) {
      postEphemeral(channel, t('messages.errors.anywhere.files'), user)
      return
    }
    await createPost(message.files, channel, ts, item_user, message.text)

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
