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
export const emojiTypeTable = new AirtablePlus({
  apiKey: process.env.AIRTABLE_API_KEY,
  baseID: 'appRxhF9qVMLbxAXR',
  tableName: 'Emoji Type'
})
export const reactionsTable = new AirtablePlus({
  apiKey: process.env.AIRTABLE_API_KEY,
  baseID: 'appRxhF9qVMLbxAXR',
  tableName: 'Emoji Reactions'
})

export const timeout = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

const sample = (arr) => arr[Math.floor(Math.random() * arr.length)]

const runSequentially = (functions) =>
  functions.reduce((promise, next) => {
    return promise.then(next)
  }, Promise.resolve())

export const unverifiedRequest = (req) => {
  if (req.body.payload) {
    const payload = JSON.parse(req.body.payload)
    return (
      !payload.token || payload.token != process.env.SLACK_VERIFICATION_TOKEN
    )
  } else {
    return (
      !req.body.token || req.body.token != process.env.SLACK_VERIFICATION_TOKEN
    )
  }
}

export const setStatus = async (user, statusText, statusEmoji) => {
  const setProfile = await fetch('https://slack.com/api/users.profile.set', {
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
  }).then((r) => r.json())
  if (!setProfile.ok) {
    await fetch(`https://slack.com/api/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      },
      body: JSON.stringify({
        channel: 'U0266FRGP',
        text: t('messages.errors.zach')
      })
    })
  }
}

export const getNow = (tz) => {
  const date = new Date().toLocaleString('en-US', { timeZone: tz })
  return new Date(date).toISOString()
}

export const getDayFromISOString = (ISOString) => {
  const date = new Date(ISOString)
  try {
    date.setHours(date.getHours() - 4)
    ISOString = date.toISOString()
  } catch { }
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
  await rebuildScrapbookFor(userRecord)
}

// accepts either a user record, or a user ID from slack
export const rebuildScrapbookFor = async (user) => {
  try {
    let userScrapbookURL = ''
    if (typeof user == 'string') {
      userScrapbookURL = (await getUserRecord(user)).fields['Scrapbook URL']
    } else {
      userScrapbookURL = user.fields['Scrapbook URL']
    }
    console.log('Attempting to rebuild scrapbook for', userScrapbookURL)
    // initiate a rebuild
    await fetch(userScrapbookURL)
    // give the site some time to generate
    await new Promise((resolve) => setTimeout(resolve, 5000))
  } catch (e) {
    // rebuilding the scrapbook is nonessential, and should never throw an error
    // that could crash a conversation/command
    console.error(e)
    return false
  }
}

export const displayStreaks = async (userId, streakCount) => {
  const userRecord = await getUserRecord(userId)
  const user = await fetch(
    `https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`
  ).then((r) => r.json())

  if (!userRecord.fields['Streaks Toggled Off']) {
    if (streakCount == 0 || !userRecord.fields['Display Streak']) {
      setStatus(userId, '', '')
    } else {
      const statusText = 'day streak in #scrapbook'
      const statusEmoji = `:som-${streakCount > 7 ? '7+' : streakCount}:`
      setStatus(userId, statusText, statusEmoji)
    }
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
  let avatar = user.profile.image_192

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
    let username = user.profile.display_name.replace(/\s/, '')
    let tzOffset = profile.user.tz_offset
    let tz = profile.user.tz.replace(`\\`, '')
    console.log(
      `No user record found for ${userId}. Creating...`,
      username,
      tzOffset,
      tz
    )
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
    if (!user.profile.is_custom_image) {
      const animalImages = [
        'https://i.imgur.com/njP1JWx.jpg',
        'https://i.imgur.com/NdOZWDB.jpg',
        'https://i.imgur.com/l8dV3DJ.jpg',
        'https://i.imgur.com/Ej6Ovlq.jpg',
        'https://i.imgur.com/VG29lvI.jpg',
        'https://i.imgur.com/tDusvvD.jpg',
        'https://i.imgur.com/63H1hQM.jpg',
        'https://i.imgur.com/xGtLTa3.png'
      ]
      const animalImage = sample(animalImages)
      console.log(
        `User ${userId} doesn't have a profile picture set. Setting to ${animalImage}`
      )
      await accountsTable.update(record.id, {
        Avatar: [
          {
            url: animalImage
          }
        ]
      })
    }
  }
  return { ...record, slack: user }
}

export const emojiExists = async (emoji, updateId) =>
  reactionsTable
    .read({
      filterByFormula: `AND({Emoji Name} = '${emoji}', {Update} = '${updateId}')`
    })
    .then((r) => r.length > 0)
    .catch((err) => console.log('Cannot check if emoji exists', err))

export const updateExists = async (updateId) =>
  reactionsTable
    .read({ filterByFormula: `{Update} = '${updateId}'` })
    .then((r) => r.length > 0)
    .catch((err) => console.log('Cannot check if update exists', err))

export const updateExistsTS = async (TS) =>
  updatesTable
    .read({ filterByFormula: `{Message Timestamp} = '${TS}'` })
    .then((r) => r.length > 0)
    .catch((err) => console.log('Cannot check if update exists', err))

export const getEmojiRecord = async (reaction) => {
  if (reaction.includes('::')) {
    // This will only happen if a skin tone is applied. e.g :+1::skin-tone-5:. Remove the modifier.
    reaction = reaction.split('::')[0]
  }
  console.log('Looking for reaction', reaction)
  const emojiRecord = await emojiTypeTable.read({
    filterByFormula: `Name = '${reaction}'`,
    maxRecords: 1
  })
  if (emojiRecord.length > 0) return emojiRecord[0]
  else {
    console.log(`emoji ${reaction} doesn't exist. creating...`)
    let emojiSource
    let unicodeEmoji = emoji.find(reaction)
    if (!unicodeEmoji) {
      console.log('looks like this is a custom emoji. finding the link...')
      const emojiList = await fetch(
        `https://slack.com/api/emoji.list?token=${process.env.SLACK_USER_TOKEN}`
      ).then((r) => r.json())
      //console.log('reaction list', emojiList.emoji)
      console.log('reaction url', emojiList.emoji[reaction])
      emojiSource = emojiList.emoji[reaction]
    } else {
      emojiSource = unicodeEmoji.emoji
    }
    const newEmojiRecord = await emojiTypeTable.create({
      Name: reaction,
      'Emoji Source': emojiSource
    })
    return newEmojiRecord
  }
}

export const getReactionRecord = async (emoji, updateId) =>
  (
    await reactionsTable.read({
      filterByFormula: `AND({Emoji Name} = '${emoji}', {Update} = '${updateId}')`
    })
  )[0]

export const getRandomWebringPost = async (user) => {
  console.log('ok!! getting webring for user ' + user)
  const userRecord = await getUserRecord(user)
  const webring = userRecord.fields['Webring']
  console.log('webring for user', webring)
  if (!webring) {
    console.log('no webring found')
    return
  }
  console.log('webring for user exists! yay!')

  const randomWebringId = sample(webring)
  console.log('random webring id', randomWebringId)
  const randomUserRecord = await accountsTable.read({
    filterByFormula: `{Record ID} = '${randomWebringId}'`
  }).catch(err => {
    console.log('error getting random webring from airtable', err)
    return 'https://hackclub.slack.com/archives/C019RJ7H08J/p1599578598347100'
  })
  console.log('random user record', randomUserRecord)

  const latestUpdate = await updatesTable.read({
    maxRecords: 1,
    sort: [{ field: 'Post Time', direction: 'desc' }],
    filterByFormula: `{Poster ID} = '${randomUserRecord[0].fields['ID']}'`
  })
  const messageTs = latestUpdate[0].fields['Message Timestamp'].replace('.', '')
  const channel = latestUpdate[0].fields['Channel']
  console.log('final message ts', messageTs)
  console.log('webring channel', channel)
  return `https://hackclub.slack.com/archives/${channel}/p${messageTs}`
}

export const isFullMember = async (userId) => {
  const user = await fetch(
    `https://slack.com/api/users.info?token=${process.env.SLACK_BOT_TOKEN}&user=${userId}`
  ).then((r) => r.json())
  console.log('user restricted', user.user.is_restricted)
  console.log('the opposite of that', !user.user.is_restricted)
  return !user.user.is_restricted
}

export const isNewMember = async (userId) => {
  const userRecord = await getUserRecord(userId)
  return userRecord.fields['New Member']
}

export const getPublicFileUrl = async (urlPrivate, channel, user) => {
  const fileName = urlPrivate.split('/').pop()
  const fileId = urlPrivate.split('-')[2].split('/')[0]
  console.log('file id', fileId)
  const acceptedFileTypes = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'mp4',
    'mov',
    'mp3',
    'wav',
    'aiff',
    'm4a'
  ]
  const videoFileTypes = ['mp4', 'mov']
  const containsAcceptedFileTypes = acceptedFileTypes.some((el) =>
    fileName.toLowerCase().endsWith(el)
  )
  const isVideo = videoFileTypes.some((el) =>
    fileName.toLowerCase().endsWith(el)
  )

  if (!containsAcceptedFileTypes && !fileName.toLowerCase().includes('heic'))
    return null
  else if (fileName.toLowerCase().endsWith('heic')) return { url: 'heic' }

  const file = await fetch(urlPrivate, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    }
  })
  let blob = await file.blob()
  console.log('blob', blob.size, blob)

  if (blob.size === 19) {
    const publicFile = await fetch(
      'https://slack.com/api/files.sharedPublicURL',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`
        },
        body: JSON.stringify({
          file: fileId
        })
      }
    ).then((r) => r.json())
    console.log('public file', publicFile)
    const permalinkPublic = publicFile.file.permalink_public
    const pubSecret = permalinkPublic.split('-').pop()
    console.log('pub secret', pubSecret)
    const directUrl = `https://files.slack.com/files-pri/T0266FRGM-${fileId}/${fileName}?pub_secret=${pubSecret}`
    console.log('direct url', directUrl)
    if (isVideo) {
      postEphemeral(channel, t('messages.errors.bigvideo'), user)
      await timeout(30000)
      const asset = await Video.Assets.create({
        input: directUrl,
        playback_policy: 'public'
      })
      return {
        url: 'https://i.imgur.com/UkXMexG.mp4',
        muxId: asset.id,
        muxPlaybackId: asset.playback_ids[0].id
      }
    } else {
      await postEphemeral(channel, t('messages.errors.imagefail'))
      return { url: directUrl }
    }
  }

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

export const createPost = async (files = [], channel, ts, user, text) => {
  let attachments = []
  let videos = []
  let videoPlaybackIds = []

  await Promise.all([
    react('add', channel, ts, 'beachball'),
    ...files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(
        file.url_private,
        channel,
        user
      )
      if (!publicUrl) {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          postEphemeral(channel, t('messages.errors.filetype'), user)
        ])
      } else if (publicUrl.url === 'heic') {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          postEphemeral(channel, t('messages.errors.heic'), user)
        ])
      } else if (publicUrl.url === 'big boy') {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          reply(channel, ts, t('messages.errors.bigimage')),
          postEphemeral(channel, t('messages.errors.bigimage'), user)
        ])
      }
      console.log('public url', publicUrl.url)
      attachments.push({ url: publicUrl.url })
      if (publicUrl.muxId) {
        videos.push(publicUrl.muxId)
        videoPlaybackIds.push(publicUrl.muxPlaybackId)
      }
    })
  ])
  let userRecord = await getUserRecord(user)
  const fullSlackMember = userRecord.fields['Full Slack Member?']
  if (!fullSlackMember) {
    const fullMember = await isFullMember(user)
    if (fullMember) {
      accountsTable.update(userRecord.id, { 'Full Slack Member?': true })
    }
  }

  const date = new Date().toLocaleString('en-US', {
    timeZone: userRecord.fields['Timezone']
  })
  const convertedDate = new Date(date).toISOString()
  const messageText = await formatText(text)
  console.log(convertedDate)

  await updatesTable.create({
    'Slack Account': [userRecord.id],
    'Post Time': convertedDate,
    'Message Timestamp': ts,
    Text: messageText,
    Attachments: attachments,
    'Mux Asset IDs': videos.toString(),
    'Mux Playback IDs': videoPlaybackIds.toString(),
    'Is Large Video': attachments.some(
      (attachment) => attachment.url === 'https://i.imgur.com/UkXMexG.mp4'
    ),
    'Channel': channel
  })

  incrementStreakCount(user, channel, messageText, ts)
  await fetchProfile(userRecord.fields['Username'])
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

export const getReplyMessage = async (user, username, day) => {
  const newMember = await isNewMember(user)
  const toggledOff = await streaksToggledOff(user)
  console.log('is new member', newMember)
  const scrapbookLink = `https://scrapbook.hackclub.com/${username}`
  let streakNumber = day <= 7 ? day : '7+'
  if (toggledOff) streakNumber = '7+'
  if (!newMember && day <= 3 && !toggledOff) {
    console.log('old member!!!')
    console.log(t('messages.streak.oldmember.' + streakNumber))
    return t('messages.streak.oldmember.' + streakNumber, {
      scrapbookLink,
      user
    })
  }
  return t('messages.streak.' + streakNumber, { scrapbookLink, user })
}

export const streaksToggledOff = async (user) => {
  const userRecord = await getUserRecord(user)
  return userRecord.fields['Streaks Toggled Off']
}

export const replaceEmoji = (str) => emoji.emojify(str.replace(/::(.*):/, ':'))

export const formatText = async (text) => {
  text = replaceEmoji(text).replace('&amp;', '&')

  const userRegex = /<@U\S+>/g
  let users = text.match(userRegex)
  if (users) {
    await Promise.all(
      users.map(async (u) => {
        const uID = u.substring(2, u.length - 1)
        console.log('user', uID)
        const userRecord = await getUserRecord(uID)
        if (!userRecord) {
          fetch(
            `https://slack.com/api/users.profile.get?token=${process.env.SLACK_BOT_TOKEN}&user=${u.substring(2, u.length - 1)}`
          )
            .then((r) => r.json())
            .then(({ profile }) => profile.display_name || profile.real_name)
            .then((displayName) => (text = text.replace(u, `@${displayName}`)))
        } else {
          console.log('found user record', userRecord)
          const username = userRecord.fields['Username']
          text = text.replace(u, `@${username}`)
        }
      })
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

  const createdTime = increment
    ? latestUpdates[1]?.fields['Post Time']
    : latestUpdates[0]?.fields['Post Time']
  const nowDay = getDayFromISOString(now)
  const createdTimeDay = getDayFromISOString(createdTime)
  console.log('nowDay', nowDay)
  console.log('created time', createdTimeDay)

  return (
    nowDay != createdTimeDay ||
    (increment ? !latestUpdates[1] : !latestUpdates[0])
  )
}

export const incrementStreakCount = (userId, channel, message, ts) =>
  new Promise(async (resolve, reject) => {
    const userRecord = await getUserRecord(userId)
    const shouldUpdate = await shouldUpdateStreak(userId, true)
    const randomWebringPost = await getRandomWebringPost(userId)
    let updatedMaxStreakCount
    const updatedStreakCount = userRecord.fields['Streak Count'] + 1
    const scrapbookLink = `https://scrapbook.hackclub.com/${userRecord.fields['Username']}`
    console.log('random webring post', randomWebringPost)

    if (shouldUpdate) {
      console.log('Updating streak for', userId)

      if (userRecord.fields['New Member'] && updatedStreakCount > 1) {
        accountsTable.update(userRecord.id, {
          'New Member': false
        })
      }
      if (userRecord.fields['Max Streaks'] < updatedStreakCount || !userRecord.fields['Max Streaks']) {
        updatedMaxStreakCount = updatedStreakCount
      } else {
        updatedMaxStreakCount = userRecord.fields['Max Streaks']
      }

      await accountsTable.update(userRecord.id, {
        'Streak Count': updatedStreakCount,
        'Max Streaks': updatedMaxStreakCount
      })
      await displayStreaks(userId, updatedStreakCount)
      fetchProfile(userRecord.fields['Username'])

      if (userRecord.fields['New Member'] && updatedStreakCount === 1) {
        postEphemeral(
          process.env.CHANNEL,
          t('messages.streak.newstreak'),
          userId
        )
      }
    }

    const replyMessage = await getReplyMessage(
      userId,
      userRecord.fields['Username'],
      updatedStreakCount
    )
    // remove beachball react
    await react('remove', channel, ts, 'beachball')
    await react('add', channel, ts, 'aom')

    try { fetch(userRecord.fields['Webhook URL']) }
    catch (err) { }

    const channelKeywords = require('./channelKeywords.json')
    if (typeof channelKeywords[channel] !== 'undefined') await react('add', channel, ts, channelKeywords[channel])
    const emojiKeywords = require('./emojiKeywords.json')
    console.log('emoji keywords', emojiKeywords)
    Object.keys(emojiKeywords).forEach(async (keyword) => {
      if (
        message
          .toLowerCase()
          .search(new RegExp('\\b' + keyword + '\\b', 'gi')) !== -1
      ) {
        await react('add', channel, ts, emojiKeywords[keyword])
      }
    })
    await reply(
      channel,
      ts,
      shouldUpdate
        ? replyMessage
        : t('messages.streak.nostreak', { scrapbookLink })
    )
    if (randomWebringPost) {
      await reply(
        channel,
        ts,
        t('messages.webring.random', { randomWebringPost }),
        true
      )
    }
  }).catch((err) => reply(channel, ts, t('messages.errors.promise', { err })))

export const setAudio = async (user, url) => {
  const userRecord = await getUserRecord(user)
  accountsTable.update(userRecord.id, {
    'Audio URL': url
  })
}

export const tsHasScrap = async (ts) => {
  const tsMessage = (await updatesTable.read({
    filterByFormula: `{Message Timestamp} = '${ts}'`
  }))[0]
  console.log('delete: ts message:', tsMessage)
  console.log('ts has scrap?', tsMessage !== undefined)

  return tsMessage !== undefined
}

export const deleteScrap = async (ts) => {
  return await updatesTable.deleteWhere(`{Message Timestamp} = '${ts}'`)
}

export const fetchProfile = (username) =>
  fetch(`https://scrapbook.hackclub.com/${username}`)

export const getUrlFromString = (str) => {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi
  let url = str.match(urlRegex)[0]
  if (url.includes('|')) url = url.split('|')[0]
  if (url.startsWith('<')) url = url.substring(1, url.length - 1)
  return url
}

export const processGist = (url) =>
  fetch(url)
    .then((r) => r.text())
    .then(async (html) => {
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
export const react = async (addOrRemove, channel, ts, reaction) =>
  await fetch('https://slack.com/api/reactions.' + addOrRemove, {
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
export const reply = async (channel, parentTs, text, unfurl) =>
  await fetch('https://slack.com/api/chat.postMessage', {
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
      unfurl_links: unfurl,
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

export const getMessage = async (ts, channel) => {
  try {
    const history = await fetch(
      `https://slack.com/api/conversations.history?token=${process.env.SLACK_BOT_TOKEN}&channel=${channel}&latest=${ts}&limit=1&inclusive=true`
    ).then((r) => r.json())
    console.log('history', history)

    if (history.messages.length < 1) return null

    return history.messages[0]
  } catch (e) {
    return null
  }
}
