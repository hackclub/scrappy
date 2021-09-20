import { reply, t, unverifiedRequest } from '../../../lib/api-utils'

const messageContainsWord = (list, msg) => {
  // if we find a word in the list, return it. if not, return null
  let foundWord = null
  list.forEach(word => {
    if (msg.includes(word.toLowerCase())) {
      foundWord = word.toLowerCase()
    }
  })
  return foundWord
}

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  } else {
    res.sendStatus(200)
  }

  const { channel, ts, user, text, thread_ts } = req.body.event

  const foundMildWord = messageContainsWord(t('mention.triggerMild').array, text)
  const foundSpicyWord = messageContainsWord(t('mention.triggerSpicy').array, text)
  const allowedToInsult = t('mention.triggerSpicyOptIn').array.includes(user)

  if (foundSpicyWord && allowedToInsult) {
    let reply
    try {
      reply = t(`mention.spicy.${foundSpicyWord}`, {user})
    } catch (err) {
      reply = t('mention.spicy.general', {user})
    }
    reply(channel, thread_ts || ts, reply)
  } else if (foundMildWord || foundSpicyWord) {
    reply(channel, thread_ts || ts, t('mention.mild', {user}))
  } else {
    reply(channel, thread_ts || ts, t('mention.any', {user}))
  }
}
