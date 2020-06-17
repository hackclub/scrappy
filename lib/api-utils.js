const AirtablePlus = require('airtable-plus')
const FormData = require('form-data')
const Mux = require('@mux/mux-node')

const { Video, Data } = new Mux(process.env.MUX_TOKEN_ID, process.env.MUX_TOKEN_SECRET)

export const accountsTable = new AirtablePlus({
  apiKey: process.env.AIRTABLE_API_KEY,
  baseID: 'appRxhF9qVMLbxAXR',
  tableName: 'Slack Accounts'
})

export const updatesTable = new AirtablePlus({
  apiKey: process.env.AIRTABLE_API_KEY,
  baseID: 'appRxhF9qVMLbxAXR',
  tableName: 'Updates'
})

export const timeout = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}
const setStatus = (user, statusText, statusEmoji) => (
  fetch('https://slack.com/api/users.profile.set', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`
    },
    body: JSON.stringify({
      user,
      profile: {
        status_text: statusText,
        status_emoji: statusEmoji,
        status_expiration: 0
      }
    })
  })
)

export const getNow = (tz) => {
  const date = new Date().toLocaleString("en-US", { timeZone: tz })
  return new Date(date).toISOString()
}

export const getDayFromISOString = (ISOString) => {
  try {
    console.log(ISOString)
    const month = ISOString.split('-')[1]
    const day = ISOString.split('-')[2].split('T')[0]
    console.log(month)
    console.log(day)
    return `${month}-${day}`
  } catch {
    console.log(`This is the user's first post!`)
  }
}

export const displayStreaks = async (userId, streakCount) => {
  const results = {}
  await Promise.all([
    fetch(
      `https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`
    ).then(r => r.json()).then(j => results.slackUser = j),
    async () => {results.userRecord = await getUserRecord(userId)}
  ])

  if (results.userRecord.fields['Display Streak']) {
    const statusText = results.slackUser.profile.status_text
    const statusEmoji = `ghost-${streakCount > 7 ? '7+' : streakCount}`
    setStatus(userId, statusText, statusEmoji)
  } else {
    setStatus(userId, '', '')

  }
}

export const canDisplayStreaks = async (userId) => {
  let record = await getUserRecord(userId)
  return record.fields['Display Streak']
}

export const getUserRecord = async (userId) => {
  const user = await fetch(
    `https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`
  ).then((r) => r.json())
  let github
  let website
  if (user.profile.fields == null) {
    github = null
    website = null
  }
  github = user.profile.fields['Xf0DMHFDQA']?.value
  website = user.profile.fields['Xf0DMHFDQA']?.value
  const avatar = user.profile.image_192

  let record
  record = (
    await accountsTable.read({
      filterByFormula: `{ID} = '${userId}'`,
      maxRecords: 1
    })
  )[0]
  if (typeof record === 'undefined') {
    let profile = await fetch(
      `https://slack.com/api/users.info?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`
    ).then((r) => r.json())
    let username = profile.user.name
    let tzOffset = profile.user.tz_offset
    console.log(profile)
    console.log(tzOffset)
    let tz = profile.user.tz.replace(`\\`, '')
    console.log(tz)
    record = await accountsTable.create({
      ID: userId,
      Username: username,
      'Streak Count': 0,
      Website: website,
      GitHub: github,
      'New Member': true,
      Avatar: [
        {
          url: avatar
        }
      ],
      'Timezone offset': tzOffset,
      'Timezone': tz
    })
  }
  return record
}

export const getPublicFileUrl = async (urlPrivate) => {
  const fileName = urlPrivate.split('/').pop()
  const acceptedFileTypes = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'mp4',
    'mov',
    'mp3',
    'wav',
    'aiff'
  ]
  const videoFileTypes = ['mp4', 'mov']
  const containsAcceptedFileTypes = acceptedFileTypes.some((el) =>
    fileName.toLowerCase().includes(el)
  )
  const isVideo = videoFileTypes.some((el) =>
    fileName.toLowerCase().includes(el)
  )

  if (!containsAcceptedFileTypes) return null

  const file = await fetch(urlPrivate, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    }
  })
  const blob = await file.blob()
  console.log('blob', blob.size, blob)

  let form = new FormData()
  form.append('file', blob.stream(), {
    filename: fileName,
    knownLength: blob.size
  })

  const uploadResp = await fetch('https://bucky.hackclub.com', {
    method: 'POST',
    body: form
  })
  const uploadedUrl = await uploadResp.text()
  console.log('uploaded url', uploadedUrl)

  if (isVideo) {
    const asset = await Video.Assets.create({
      input: uploadedUrl
    })

    const playback = await Video.Assets.createPlaybackId(asset.id, {
      policy: 'public'
    })
    console.log('asset', asset)
    console.log('playback', playback)

    return {
      url: uploadedUrl,
      muxId: asset.id,
      muxPlaybackId: playback.id
    }
  }
  return {
    url: uploadedUrl,
    muxId: null,
    muxPlaybackId: null
  }
}

export const postEphemeral = (channel, text, user) =>
  fetch('https://slack.com/api/chat.postEphemeral', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({
      attachments: [],
      channel: channel,
      text: text,
      user: user
    })
  })

export const sendCommandResponse = (responseUrl, text) => {
  fetch(responseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      response_type: 'ephemeral'
    })
  })
}

export const getReplyMessage = (user, username, day) => {
  const scrapbookLink = `https://scrapbook.hackclub.com/${username}`
  const streakNumber = day <= 7 ? day : '7+'
  return t('messages.streak.' + streakNumber, { scrapbookLink, user })
}

export const formatText = (text) => {
  //<@USLACKBOT>
  // if (text.includes('<@')) {
  //   const userId = text.split('@').pop().split('>')[0]
  //   console.log(`userId`, userId)
  //   const userProfile = await fetch(`https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`)
  // }
  let userIds = text.split(' ').filter(word => word.includes('<@U'))
  if (userIds.length == 0) return text

  userIds.forEach(async (userId) => {
    try {
      const id = userId.split('@').pop().split('>')[0]
      const userProfile = await fetch(`https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${id}`).then(r => r.json())
      console.log(userProfile)
      const displayName = userProfile.profile.display_name
      userId = `@${displayName}`
    } catch (err) {
      console.log(err)
    }
  })
  console.log(userIds.join(' '))
  return userIds.join(' ')
}

export const incrementStreakCount = async (userId, channel, ts) => {
  const userRecord = await getUserRecord(userId)
  const now = getNow(userRecord.fields['Timezone'])

  const latestUpdates = await updatesTable.read({
    maxRecords: 2,
    sort: [{ field: 'Post Time', direction: 'desc' }],
    filterByFormula: `FIND('${userId}', {ID}) > 0`
  })

  const createdTime = latestUpdates[1]?.fields['Post Time']
  const nowDay = getDayFromISOString(now)
  const createdTimeDay = getDayFromISOString(createdTime)

  if (nowDay !== createdTimeDay || !latestUpdates[1]) {
    const updatedStreakCount = userRecord.fields['Streak Count'] + 1

    if (userRecord.fields['New Member'] && updatedStreakCount > 1) {
      accountsTable.update(userRecord.id, {
        'New Member': false
      })
    }

    await accountsTable.update(userRecord.id, {
      'Streak Count': updatedStreakCount
    })
    await displayStreaks(userId, updatedStreakCount)
    fetchProfile(userRecord.fields['Username'])

    const updatedUserRecord = await getUserRecord(userId)
    const replyMessage = getReplyMessage(
      userId,
      userRecord.fields['Username'],
      updatedStreakCount,
      updatedUserRecord.fields['New Member']
    )
    // remove beachball react, add final summer-of-making react
    await Promise.all([
      react('remove', channel, ts, 'beachball'),
      react('add', channel, ts, 'summer-of-making'),
      reply(channel, ts, replyMessage)
    ])
  } else {
    const userRecord = await getUserRecord(userId)
    const scrapbookLink = `https://scrapbook.hackclub.com/${userRecord.fields['Username']}`
    await Promise.all([
      react('remove', channel, ts, 'beachball'),
      react('add', channel, ts, 'summer-of-making'),
      reply(channel, ts, t('messages.streak.7+', { scrapbookLink, userId }))
    ])
  }
}

export const deleteScrap = async (ts) => {
  return await updatesTable.deleteWhere(`{Message Timestamp} = '${ts}'`)
}

export const fetchProfile = (username) => (
  fetch(`https://scrapbook.hackclub.com/${username}`).then(r => r.json())
)

// ex. react('add', 'C248d81234', '12384391.12231', 'beachball')
export const react = (addOrRemove, channel, ts, reaction) => (
  fetch('https://slack.com/api/reactions.' + addOrRemove, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({ channel: channel, name: reaction, timestamp: ts })
  }).then(r => r.json()).catch(err => console.error(err))
)

// replies to a message in a thread
//
// ex. reply('C34234d934', '31482975923.12331', 'this is a threaded reply!')
export const reply = (channel, parentTs, text) => (
  fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({
      channel: channel,
      thread_ts: parentTs,
      text: text,
      parse: 'mrkdwn',
      unfurl_links: false,
      unfurl_media: false,
    })
  }).then(r => r.json()).then(json => json.ts)
)

// ex. t('greeting', { userID: 'UX12U391' })
export const t = (search, vars) => {
  if (vars) {
    console.log(
      `I'm searching for words in my yaml file under "${search}". These variables are set: ${JSON.stringify(
        vars
      )}`
    )
  } else {
    console.log(`I'm searching for words in my yaml file under "${search}"`)
  }
  const searchArr = search.split('.')
  const transcriptObj = require('./transcript.yml')

  return evalTranscript(recurseTranscript(searchArr, transcriptObj), vars)
}
const recurseTranscript = (searchArr, transcriptObj, topRequest) => {
  topRequest = topRequest || searchArr.join('.')
  const searchCursor = searchArr.shift()
  const targetObj = transcriptObj[searchCursor]

  if (!targetObj) {
    return topRequest
  }
  if (searchArr.length > 0) {
    return recurseTranscript(searchArr, targetObj, topRequest)
  } else {
    if (Array.isArray(targetObj)) {
      return sample(targetObj)
    } else {
      return targetObj
    }
  }
}
const evalTranscript = (target, vars = {}) => {
  const context = {
    ...vars, t
  }
  return function () {
    return eval('`' + target + '`')
  }.call(context)
}

const sample = arr => arr[Math.floor(Math.random() * arr.length)]