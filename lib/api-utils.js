const cheerio = require('cheerio')
const AirtablePlus = require('airtable-plus')
const FormData = require('form-data')
const Mux = require('@mux/mux-node')
const emoji = require('node-emoji')

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID,
  process.env.MUX_TOKEN_SECRET
)

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

const sample = (arr) => arr[Math.floor(Math.random() * arr.length)]

export const unverifiedRequest = (req) => {
  if (req.body.payload) {
    const payload = JSON.parse(req.body.payload)
    return !payload.token || payload.token != process.env.SLACK_VERIFICATION_TOKEN
  } else {
    return !req.body.token || req.body.token != process.env.SLACK_VERIFICATION_TOKEN
  }
}

export const setStatus = async (user, statusText, statusEmoji) =>
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


export const getNow = (tz) => {
  const date = new Date().toLocaleString('en-US', { timeZone: tz })
  return new Date(date).toISOString()
}

export const getDayFromISOString = (ISOString) => {
  try {
    const month = ISOString.split('-')[1]
    const day = ISOString.split('-')[2].split('T')[0]
    console.log(month)
    console.log(day)
    return `${month}-${day}`
  } catch {
    console.log(`This is the user's first post!`)
  }
}

export const forgetUser = async (user) => {
  // get the user's info
  const userRecord = await getUserRecord(user)

  await Promise.all([
    // delete their updates...
    updatesTable.deleteWhere(`{Poster ID} = "${user}"`),
    // delete their profile...
    accountsTable.deleteWhere(`{ID} = "${user}"`)
  ])
  await fetch(`https://scrapbook.hackclub.com/${userRecord.fields['Username']}`)
}

export const displayStreaks = async (userId, streakCount) => {
  const userRecord = await getUserRecord(userId)
  const user = await fetch(
    `https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`
  ).then((r) => r.json())

  if (streakCount == 0 || !userRecord.fields['Display Streak']) {
    setStatus(userId, '', '')
  }
  else {
    const statusText = "day streak in #scrapbook"
    const statusEmoji = `:som-${streakCount > 7 ? '7+' : streakCount}:`
    setStatus(userId, statusText, statusEmoji)
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
  } else {
    github = user.profile.fields['Xf0DMHFDQA']?.value
    website = user.profile.fields['Xf5LNGS86L']?.value
  }
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
      Timezone: tz
    })
  }
  return { ...record, slack: user }
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
    fileName.toLowerCase().endsWith(el)
  )
  const isVideo = videoFileTypes.some((el) =>
    fileName.toLowerCase().endsWith(el)
  )

  if (!containsAcceptedFileTypes && !fileName.toLowerCase().includes('heic')) return null
  else if (fileName.toLowerCase().endsWith('heic')) return 'heic'

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
      input: uploadedUrl,
      playback_policy: 'public'
    })

    console.log('asset', asset)

    return {
      url: uploadedUrl,
      muxId: asset.id,
      muxPlaybackId: asset.playback_ids[0].id
    }
  }
  return {
    url: uploadedUrl,
    muxId: null,
    muxPlaybackId: null
  }
}

export const postEphemeral = (channel, text, user, threadTs) =>
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
      user: user,
      thread_ts: threadTs
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

export const replaceEmoji = (str) => emoji.emojify(str)

export const formatText = async (text) => {
  text = replaceEmoji(text).replace('&amp;', '&')

  const userRegex = /<@U\S+>/g
  let users = text.match(userRegex)
  if (users) {
    await Promise.all(
      users.map((u) =>
        fetch(
          `https://slack.com/api/users.profile.get?token=${
          process.env.SLACK_BOT_TOKEN
          }&user=${u.substring(2, u.length - 1)}`
        )
          .then((r) => r.json())
          .then(({ profile }) => profile.display_name || profile.real_name)
          .then((displayName) => text = text.replace(u, `@${displayName}`))
      )
    )
  }

  const channelRegex = /<#[^|>]+\|\S+>/g
  let channels = text.match(channelRegex)
  if (channels) {
    channels.forEach(async (channel) => {
      const channelName = channel.split('|')[1].replace('>', '')
      text = text.replace(channel, `#${channelName}`)
    })
  }

  return text
}

export const shouldUpdateStreak = async (userId, increment) => {
  const userRecord = await getUserRecord(userId)
  const now = getNow(userRecord.fields['Timezone'])

  const latestUpdates = await updatesTable.read({
    maxRecords: 2,
    sort: [{ field: 'Post Time', direction: 'desc' }],
    filterByFormula: `FIND('${userId}', {ID}) > 0`
  })

  const createdTime = increment ? latestUpdates[1]?.fields['Post Time'] : latestUpdates[0]?.fields['Post Time']
  const nowDay = getDayFromISOString(now)
  const createdTimeDay = getDayFromISOString(createdTime)
  console.log('nowDay', nowDay)
  console.log('created time', createdTimeDay)

  return nowDay != createdTimeDay || (increment ? !latestUpdates[1] : !latestUpdates[0])
}

export const incrementStreakCount = async (userId, channel, ts) => {
  const userRecord = await getUserRecord(userId)
  const shouldUpdate = await shouldUpdateStreak(userId, true)
  const reactingEmojis = 'summer-of-making rocket clap fire party-dinosaur sparkles parrot yay exploding_head sauropod tada zap'.split(' ')
  const randomEmoji = sample(reactingEmojis)

  if (shouldUpdate) {
    console.log('askldalkjaskdlgj')
    const updatedStreakCount = userRecord.fields['Streak Count'] + 1

    if (userRecord.fields['New Member'] && updatedStreakCount > 7) {
      accountsTable.update(userRecord.id, {
        'New Member': false
      })
    }

    accountsTable.update(userRecord.id, {
      'Streak Count': updatedStreakCount
    })
    await displayStreaks(userId, updatedStreakCount)
    fetchProfile(userRecord.fields['Username'])

    const replyMessage = getReplyMessage(
      userId,
      userRecord.fields['Username'],
      updatedStreakCount
    )
    // remove beachball react, add final summer-of-making react
    await Promise.all([
      react('remove', channel, ts, 'beachball'),
      react('add', channel, ts, 'summer-of-making'),
      react('add', channel, ts, randomEmoji),
      reply(channel, ts, replyMessage),
    ])
    if (userRecord.fields['New Member'] && updatedStreakCount === 1) {
      postEphemeral(process.env.CHANNEL, t('messages.streak.newstreak'), userId)
    }
  } else {
    const userRecord = await getUserRecord(userId)
    const scrapbookLink = `https://scrapbook.hackclub.com/${userRecord.fields['Username']}`
    await Promise.all([
      react('remove', channel, ts, 'beachball'),
      react('add', channel, ts, 'summer-of-making'),
      react('add', channel, ts, randomEmoji),
      reply(channel, ts, t('messages.streak.nostreak', { scrapbookLink, userId }))
    ])
  }
}

export const deleteScrap = async (ts) => {
  return await updatesTable.deleteWhere(`{Message Timestamp} = '${ts}'`)
}

export const fetchProfile = (username) =>
  fetch(`https://scrapbook.hackclub.com/${username}`)

export const getUrlFromString = (str) => {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  let url = str.match(urlRegex)[0]
  if (url.includes('|')) url = url.split('|')[0]
  if (url.startsWith('<')) url = url.substring(1, url.length - 1)
  return url
}

export const processGist = (url) =>
  fetch(url)
    .then(r => r.text())
    .then(async html => {
      const $ = cheerio.load(html)
      let raw = $('.file .file-actions a').attr('href')
      if (Array.isArray(raw)) raw = raw[0]
      if (raw.endsWith('.css')) {
        const githubUrl = 'https://gist.githubusercontent.com' + raw
        return githubUrl
      } else {
        return url
      }
    })

// ex. react('add', 'C248d81234', '12384391.12231', 'beachball')
export const react = (addOrRemove, channel, ts, reaction) =>
  fetch('https://slack.com/api/reactions.' + addOrRemove, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({ channel: channel, name: reaction, timestamp: ts })
  })
    .then((r) => r.json())
    .catch((err) => console.error(err))

// replies to a message in a thread
//
// ex. reply('C34234d934', '31482975923.12331', 'this is a threaded reply!')
export const reply = (channel, parentTs, text) =>
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
      unfurl_media: false
    })
  })
    .then((r) => r.json())
    .then((json) => json.ts)

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
    ...vars,
    t
  }
  return function () {
    return eval('`' + target + '`')
  }.call(context)
}
