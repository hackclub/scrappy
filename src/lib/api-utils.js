import cheerio from 'cheerio'
import FormData from 'form-data'
import Mux from '@mux/mux-node'
import emoji from 'node-emoji'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import prisma from './prisma.js'
import channelKeywords from './channelKeywords.js'
import emojiKeywords from './emojiKeywords.js'

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID,
  process.env.MUX_TOKEN_SECRET
)

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
  } catch {}
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
    await prisma.updates.deleteMany({
      where: {
        slackID: user
      }
    }),
    // delete their account
    await prisma.accounts.deleteMany({
      where: {
        accountsSlackID: user
      }
    })
  ])
  await rebuildScrapbookFor(userRecord)
}

// accepts either a user record, or a user ID = require(slack
export const rebuildScrapbookFor = async (user) => {
  try {
    let userScrapbookURL = ''
    if (typeof user == 'string') {
      userScrapbookURL = (await getUserRecord(user)).username
    } else {
      userScrapbookURL = `https://scrapbook.hackclub.com/${user.username}`
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
    `https://slack.com/api/users.profile.get?user=${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    }
  ).then((r) => r.json())

  if (!userRecord.streaksToggledOff) {
    if (streakCount == 0 || !userRecord.displayStreak) {
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
  return record.displayStreak
}

export const getUserRecord = async (userId) => {
  console.log(userId)
  const user = await fetch(
    `https://slack.com/api/users.profile.get?user=${userId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    }
  ).then((r) => r.json())
  console.log(user)
  let github
  let website
  if(user.profile === undefined){
    return
  }
  try{
    if (user.profile.fields === null) {
      github = null
      website = null
    } else {
      github = user.profile.fields['Xf0DMHFDQA']?.value
      website = user.profile.fields['Xf5LNGS86L']?.value
    }
  }
  catch(e){
    console.log(e)
  }

  let avatar = user.profile.image_192

  let record = await prisma.accounts.findUnique({
    where: {
      slackID: userId
    }
  })

  if (record === null) {
    let profile = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,{
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
        }
      }
    ).then((r) => r.json())
    let username =
      user.profile.display_name !== ''
        ? user.profile.display_name.replace(/\s/g, '')
        : user.profile.real_name.replace(/\s/g, '')
    let tzOffset = profile.user.tz_offset
    let tz = profile.user.tz.replace(`\\`, '')
    console.log(
      `No user record found for ${userId}. Creating...`,
      username,
      tzOffset,
      tz
    )
    let checkIfExists = prisma.accounts.findFirst({
      where: {username: username}
    })
    record = await prisma.accounts.create({
      data: {
        slackID: userId,
        username: checkIfExists == null ? username : username + '-' + userId ,
        streakCount: 0,
        website: website,
        github: github,
        newMember: true,
        avatar: avatar,
        timezoneOffset: tzOffset,
        timezone: tz
      }
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
      await prisma.accounts.update({
        where: { slackID: userId },
        data: { avatar: animalImage }
      })
    }
  }
  return { ...record, slack: user }
}

export const emojiExists = async (emoji, updateId) =>
  prisma.emojiReactions
    .findMany({
      where: {
        updateId: updateId,
        emojiTypeName: emoji
      }
    })
    .then((r) => r.length > 0)
    .catch((err) => console.log('Cannot check if emoji exists', err))

export const updateExists = async (updateId) =>
  prisma.emojiReactions
    .findMany({
      where: {
        updateId: updateId
      }
    })
    .then((r) => r.length > 0)
    .catch((err) => console.log('Cannot check if update exists', err))

export const updateExistsTS = async (TS) =>
  prisma.updates
    .findMany({
      where: {
        messageTimestamp: parseFloat(TS)
      }
    })
    .then((r) => r.length > 0)
    .catch((err) => console.log('Cannot check if update exists', err))

export const getEmojiRecord = async (reaction) => {
  if (reaction.includes('::')) {
    // This will only happen if a skin tone is applied. e.g :+1::skin-tone-5:. Remove the modifier.
    reaction = reaction.split('::')[0]
  }
  console.log('Looking for reaction', reaction)
  const emojiRecord = await prisma.emojiType.findMany({
    where: {
      name: reaction
    }
  })
  if (emojiRecord.length > 0) return emojiRecord[0]
  else {
    console.log(`emoji ${reaction} doesn't exist. creating...`)
    let emojiSource
    let unicodeEmoji = emoji.find(reaction)
    if (!unicodeEmoji) {
      console.log('looks like this is a custom emoji. finding the link...')
      const emojiList = await fetch(
        `https://slack.com/api/emoji.list`, {
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
          }
        }
      ).then((r) => r.json())
      //console.log('reaction list', emojiList.emoji)
      console.log('reaction url', emojiList.emoji[reaction])
      emojiSource = emojiList.emoji[reaction]
    } else {
      emojiSource = unicodeEmoji.emoji
    }
    const newEmojiRecord = await prisma.emojiType.create({
      data: {
        name: reaction,
        emojiSource: emojiSource
      }
    })
    return newEmojiRecord
  }
}

export const getReactionRecord = async (emoji, updateId) =>
  (
    await prisma.emojiReactions.findMany({
      where: {
        emojiTypeName: emoji,
        updateId: updateId
      }
    })
  )[0]

export const getRandomWebringPost = async (user) => {
  console.log('ok!! getting webring for user ' + user)
  const userRecord = await getUserRecord(user)
  const webring = userRecord.webring
  console.log('webring for user', webring)
  if (!webring || !webring.length) {
    console.log('no webring found')
    return { notfound: true}
  }
  console.log('webring for user exists! yay!')

  const randomUserRecord = sample(webring)
  console.log('random user record', randomUserRecord)

  const latestUpdate = await prisma.updates.findMany({
    orderBy: [
      {
        postTime: 'desc'
      }
    ],
    where: {
      accountsSlackID: randomUserRecord
    }
  })
  const randomUserRecordFull = await prisma.accounts.findFirst({
    where: {
      slackID: randomUserRecord
    }
  })
  console.log('latest update', latestUpdate)
  if (latestUpdate.length === 0) {
    // triggered when a user has somebody in their webring, but that person doesn't have any posts
    console.log(
      "tried to get a user's latest webring post, but the person didn't have any posts :( NONEXISTENCEEEEEEEEEEEE"
    )
    return {
      post: null,
      scrapbookUrl:
        'https://scrapbook.hackclub.com/' + randomUserRecordFull.username,
      nonexistence: true
    }
  } else {
    console.log(latestUpdate[0])
    const messageTs = latestUpdate[0].messageTimestamp.toString().replace('.', '') +'00'
    const channel = latestUpdate[0].channel
    console.log('final message ts', messageTs)
    console.log('webring channel', channel)
    return {
      post: `https://hackclub.slack.com/archives/${channel}/p${messageTs}`,
      scrapbookUrl:
        'https://scrapbook.hackclub.com/' + randomUserRecordFull.username
    }
  }
}

export const isFullMember = async (userId) => {
  const user = await fetch(
    `https://slack.com/api/users.info?user=${userId}`,{
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    }
  ).then((r) => r.json())
  console.log('user restricted', user.user.is_restricted)
  console.log('the opposite of that', !user.user.is_restricted)
  return !user.user.is_restricted
}

export const isNewMember = async (userId) => {
  const userRecord = await getUserRecord(userId)
  return userRecord.newMember
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
  let cdnAPIResponse = await fetch('https://cdn.hackclub.com/api/v1/new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([uploadedUrl])
  }).then((r) => r.json())
  return {
    url: cdnAPIResponse[0],
    muxId: null,
    muxPlaybackId: null
  }
}

export const createPost = async (files = [], channel, ts, user, text) => {
  let attachments = []
  let videos = []
  let videoPlaybackIds = []

  const upload = await Promise.all([
    react('add', channel, ts, 'beachball'),
    ...files.map(async (file) => {
      const publicUrl = await getPublicFileUrl(file.url_private, channel, user)
      if (!publicUrl) {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          react('add', channel, ts, 'x'),
          reply(channel, ts, t('messages.errors.filetype'))
        ])
        return 'error'
      } else if (publicUrl.url === 'heic') {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          react('add', channel, ts, 'x'),
          reply(channel, ts, t('messages.errors.heic'))
        ])
        return 'error'
      } else if (publicUrl.url === 'big boy') {
        await Promise.all([
          react('remove', channel, ts, 'beachball'),
          reply(channel, ts, t('messages.errors.bigimage'))
        ])
      }
      console.log('public url', publicUrl.url)
      attachments.push(publicUrl.url)
      if (publicUrl.muxId) {
        videos.push(publicUrl.muxId)
        videoPlaybackIds.push(publicUrl.muxPlaybackId)
      }
    })
  ]).then((values) => {
    console.log('values', values)
    if (values[1] === 'error') {
      return 'error'
    }
  })
  if (upload === 'error') {
    return
  }
  let userRecord = await getUserRecord(user)
  const fullSlackMember = userRecord.fullSlackMember
  if (!fullSlackMember) {
    const fullMember = await isFullMember(user)
    if (fullMember) {
      await prisma.accounts.update({
        where: {
          slackID: userRecord.slackID
        },
        data: {
          fullSlackMember: true
        }
      })
    }
  }

  const date = new Date().toLocaleString('en-US', {
    timeZone: userRecord.timezone
  })
  const convertedDate = new Date(date).toISOString()
  const messageText = await formatText(text)
  console.log(convertedDate)

  await prisma.updates.create({data:{
    accountsSlackID: userRecord.slackID,
    postTime: convertedDate,
    messageTimestamp: parseFloat(ts),
    text: messageText,
    attachments: attachments,
    muxAssetIDs: videos,
    muxPlaybackIDs: videoPlaybackIds,
    isLargeVideo: attachments.some(
      (attachment) => attachment.url === 'https://i.imgur.com/UkXMexG.mp4'
    ),
    channel: channel
  }})

  console.log('calling incrementStreakCount')
  await incrementStreakCount(user, channel, messageText, ts)
  await fetchProfile(userRecord.username)
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
  return userRecord.streaksToggledOff
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
            `https://slack.com/api/users.profile.get?user=${u.substring(2, u.length - 1)}`, {
              headers: {
                Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
              }
            }
          )
            .then((r) => r.json())
            .then(({ profile }) => profile.display_name || profile.real_name)
            .then((displayName) => (text = text.replace(u, `@${displayName}`)))
        } else {
          const username = userRecord.username
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
  const now = getNow(userRecord.timezone)

  const latestUpdates = await prisma.updates.findMany({
    orderBy: [
      {
        postTime: 'desc'
      }
    ],
    where: {
      accountsSlackID: userRecord.slackID
    }
  })

  const createdTime = increment
    ? latestUpdates[1]?.postTime
    : latestUpdates[0]?.postTime
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
    console.log('increment streak count')
    const userRecord = await getUserRecord(userId)
    const shouldUpdate = await shouldUpdateStreak(userId, true)
    const randomWebringPost = await getRandomWebringPost(userId)
    let updatedMaxStreakCount
    const updatedStreakCount = userRecord.streakCount + 1
    const scrapbookLink =
      'https://scrapbook.hackclub.com/' + userRecord.username
    console.log('random webring post', randomWebringPost)

    if (shouldUpdate) {
      console.log('Updating streak for', userId)

      if (userRecord.newMember && updatedStreakCount > 1) {
        prisma.accounts.update({
          where: {
            slackID: userRecord.slackID
          },
          data: {
            newMember: false
          }
        })
      }
      if (
        userRecord.maxStreaks < updatedStreakCount ||
        !userRecord.maxStreaks
      ) {
        updatedMaxStreakCount = updatedStreakCount
      } else {
        updatedMaxStreakCount = userRecord.maxStreaks
      }

      await prisma.accounts.update({
        where: {
          slackID: userRecord.slackID
        },
        data: {
          maxStreaks: updatedMaxStreakCount,
          streakCount: updatedStreakCount
        }
      })
      await displayStreaks(userId, updatedStreakCount)
      fetchProfile(userRecord.username)

      if (userRecord.newMember && updatedStreakCount === 1) {
        postEphemeral(
          channel,
          t('messages.streak.newstreak'),
          userId
        )
      }
    }

    const replyMessage = await getReplyMessage(
      userId,
      userRecord.username,
      updatedStreakCount
    )
    // remove beachball react
    await react('remove', channel, ts, 'beachball')
    await react('add', channel, ts, 'wom')

    try {
      if(userRecord.webhookURL){
        fetch(userRecord.webhookURL)
      }
    } catch (err) {}

    if (typeof channelKeywords[channel] !== 'undefined')
      await react('add', channel, ts, channelKeywords[channel])
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
    if (randomWebringPost.post) {
      await reply(
        channel,
        ts,
        t('messages.webring.random', {
          randomWebringPost: randomWebringPost.post
        }),
        true
      )
    } else if (!randomWebringPost.post && randomWebringPost.nonexistence) {
      await reply(
        channel,
        ts,
        t('messages.webring.nonexistence', {
          scrapbookUrl: randomWebringPost.scrapbookUrl
        })
      )
    }
  }).catch((err) => reply(channel, ts, t('messages.errors.promise', { err })))

export const setAudio = async (user, url) => {
  const userRecord = await getUserRecord(user)
  await prisma.accounts.update({
    where: {
      slackID: userRecord.slackID
    },
    data: {
      customAudioURL: url
    }
  })
}

export const tsHasScrap = async (ts) => {
  const tsMessage = (
    await prisma.updates.findMany({
      where: {
        messageTimestamp: parseFloat(ts)
      }
    })
  )[0]
  console.log('delete: ts message:', tsMessage)
  console.log('ts has scrap?', tsMessage !== undefined)

  return tsMessage !== undefined
}

export const deleteScrap = async (ts) => {
  return await prisma.updates.deleteMany({
    where: {
      messageTimestamp: parseFloat(ts)
    }
  })
}

export const fetchProfile = (username) =>
  fetch(`https://scrapbook.hackclub.com/${username}`)

export const getUrlFromString = (str) => {
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi
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
  const transcriptObj = yaml.load(
    fs.readFileSync(path.join(process.cwd(), 'src/lib/transcript.yml'), 'utf-8')
  )

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
      `https://slack.com/api/conversations.history?channel=${channel}&latest=${ts}&limit=1&inclusive=true`, {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
        }
      }
    ).then((r) => r.json())
    console.log('history', history)

    if (history.messages.length < 1) return null

    return history.messages[0]
  } catch (e) {
    return null
  }
}
