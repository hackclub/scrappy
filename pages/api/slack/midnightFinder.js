import { accountsTable, updatesTable, displayStreaks, getNow, setStatus } from '../../../lib/api-utils'

export default async (req, res) => {
  res.status(200).end()

  const users = await accountsTable.read()
  users.forEach(async (user) => {
    const userId = user.fields['ID']
    const timezone = user.fields['Timezone']
    const username = user.fields['Username']
    let now = new Date(getNow(timezone))
    let twoDaysAgo = new Date(getNow(timezone))
    twoDaysAgo = new Date(twoDaysAgo.setDate(now.getDate() - 2)).toISOString()
    //console.log(username, 'now', now)
    //console.log(username, 'two days ago', twoDaysAgo)

    const latestUpdate = await updatesTable.read({
      maxRecords: 1,
      sort: [{ field: 'Post Time', direction: 'desc' }],
      filterByFormula: `{Poster ID} = '${userId}'`
    })
    const createdTime = latestUpdate[0]?.fields['Post Time']
    const createdDate = new Date(createdTime).getDate()
    console.log(username, now.getDate(), new Date(createdTime).getDate())

    if (now.getDate() - createdDate > 1 && user.fields['Streak Count'] != 0) {
      console.log(`It's been more than a day since ${username} last posted. Resetting their streak...`)
      accountsTable.update(user.id, {
        'Streak Count': 0
      })
      setStatus(userId, '', '')
      fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify({
          channel: 'U4QAK9SRW', //userId
          text: `<@${userId}> It's been more than 24 hours since you last posted a Scrapbook update, so I've reset your streak. No worries, though—post something else to start another streak! And the rest of your updates are still available at https://scrapbook.hackclub.com/${username} :)`
        })
      })
    }
  })

  // const users = await accountsTable.read()
  // console.log(Date.now())
  // users.forEach(async (user) => {
  //   const userId = user.fields['ID']
  //   const tzOffset = user.fields['Timezone offset'] * 1000
  //   const username = user.fields['Username']
  //   const localTime = tzOffset + Date.now()
  //   const timeString = new Date(localTime).toUTCString()

  //   console.log(username, timeString)
  //   if (timeString.split(' ')[4].split(':')[0] === '00' && user.fields['Streak Count'] != 0) {
  //     const latestUpdate = await updatesTable.read({
  //       maxRecords: 1,
  //       sort: [{ field: 'Post Time', direction: 'desc' }],
  //       filterByFormula: `FIND('${username}', {ID}) > 0`
  //     })
  //     const createdTime = Date.parse(latestUpdate[0]?.fields['Post Time'])
  //     if (Date.parse(timeString) - createdTime > 86400000) {
  //       console.log(`It's midnight for ${username} and it's been 48 hours since they last posted. Resetting their streak...`)
  //       accountsTable.update(user.id, {
  //         'Streak Count': 0
  //       })
  //       await fetch('https://slack.com/api/users.profile.set', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`
  //         },
  //         body: JSON.stringify({
  //           user: userId,
  //           profile: { status_text: '', status_emoji: `` }
  //         })
  //       })
  //       fetch('https://slack.com/api/chat.postMessage', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
  //         },
  //         body: JSON.stringify({
  //           channel: 'U4QAK9SRW', //userId
  //           text: `<@${userId}> It's been more than 24 hours since you last posted a Scrapbook update, so I've reset your streak. No worries, though—post something else to start another streak! And the rest of your updates are still available at https://scrapbook.hackclub.com/${username} :)`
  //         })
  //       })
  //       //console.log(username, latestUpdate[0].fields['Post Time'], new Date(Date.now()).toUTCString(), Date.now() - createdTime)
  //     }
  //   }
  // })
}