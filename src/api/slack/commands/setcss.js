import cheerio from 'cheerio'
import fetch from 'node-fetch'

import {
  sendCommandResponse,
  
  getUserRecord,
  
  t,
  unverifiedRequest
}  from '../../../lib/api-utils'
import prisma from '../../../lib/prisma'

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  }

  const command = req.body
  console.log(command)
  const args = command.text.split(' ')
  let url = args[0] === 'setcss' ? args[1] : args[0]
  url = url?.substring(0, url.length)
  console.log('url', url)

  if (!url) {
    const userRecord = await getUserRecord(command.user_id)
    if (userRecord.cssURL != null) {
      await prisma.accounts.update({
        where: { slackID: userRecord.slackID },
        data: { cssURL: null }
      })
      sendCommandResponse(command.response_url, t('messages.css.removed'))
    } else {
      sendCommandResponse(command.response_url, t('messages.css.noargs'))
    }
  } else if (url.includes('gist.github.com')) {
    url = await fetch(url)
      .then((r) => r.text())
      .then(async (html) => {
        const $ = cheerio.load(html)
        let raw = $('.file .file-actions a').attr('href')
        if (Array.isArray(raw)) raw = raw[0]
        if (raw.endsWith('.css')) {
          const user = await getUserRecord(command.user_id)
          const githubUrl = 'https://gist.githubusercontent.com' + raw
          await prisma.accounts.update({
            where: { slackID: user.slackID },
            data: { cssURL: githubUrl }
          })
          const username = user.username
          sendCommandResponse(
            command.response_url,
            t('messages.css.set', { url: githubUrl, username })
          )
        } else {
          sendCommandResponse(command.response_url, t('messages.css.nocss'))
        }
      })
  } else {
    const user = await getUserRecord(command.user_id)
    const username = user.username
    if (url === 'delete' || url === 'remove') {
      await prisma.accounts.update({
        where: { slackID: user.slackID },
        data: { cssURL: '' }
      })
      sendCommandResponse(command.response_url, t('messages.css.removed'))
    } else {
      if (!url.includes('http')) {
        url = url
      }
      await prisma.accounts.update({
        where: { slackID: user.slackID },
        data: { cssURL: url }
      })
      await sendCommandResponse(
        command.response_url,
        t('messages.css.set', { url, username })
      )
    }
  }
  res.status(200).end()
}
