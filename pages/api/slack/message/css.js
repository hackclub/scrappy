import { getUserRecord, accountsTable, reply, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  const { user, text, ts, channel } = req.body.event
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig

  const url = text.match(urlRegex)[0]
  console.log(url)

  const userRecord = await getUserRecord(user)
  await accountsTable.update(userRecord.id, {
    'CSS URL': url
  })
  reply(channel, ts, t('messages.css.set'))
}