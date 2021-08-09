const AirtablePlus = require('airtable-plus')
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

let prisma = new PrismaClient()

const airtable = new AirtablePlus({
  baseID: 'appRxhF9qVMLbxAXR',
  apiKey: process.env.AIRTABLE_KEY,
  tableName: 'Emoji Reactions'
})

;(async () => {
  
  console.log('running!')
  const deleteReactions = await prisma.emojiReactions.deleteMany({
    where: {
      emojiTypeName: {
        not: 'no_emoji_is_called_this',
      },
    },
  })
  console.log('deleted RIP!')
  const read = await airtable.read()
  console.log('read!')
  const toMake = read.map((x) => ({
    emojiTypeName: x.fields['Emoji Name'] ? x.fields['Emoji Name'] : 'sparkles',
    usersReacted: x.fields['Reacted By'] ? x.fields['Reacted By'] : [],
    timestamp: x.fields['Timestamp']
      ? parseFloat(x.fields['Timestamp'])
      : 1594349149.4245
  }))
  await Promise.all(
    toMake.map(async (reaction) => {
      try {
        let update = await prisma.updates.findFirst({
          where: { messageTimestamp: reaction.timestamp }
        })
        await prisma.emojiReactions.create({
          data: {
            emojiTypeName: reaction.emojiTypeName,
            usersReacted: reaction.usersReacted,
            updateId: update.id
          }
        })
      } catch (e) {
        console.log(e)
        console.log(reaction)
      }
    })
  )
  console.log('written!')
})()
