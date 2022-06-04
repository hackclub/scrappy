import {
  sendCommandResponse,
  getUserRecord,
  t,
  unverifiedRequest
} from '../../../lib/api-utils.js'
import prisma from '../../../lib/prisma.js'

import fetch from 'node-fetch'

const TEAM_ID = "team_gUyibHqOWrQfv3PDfEUpB45J"

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  }

  const command = req.body
  const args = command.text.split(' ')
  const arg = args[0] === 'setdomain' ? args[1] : args[0]
  if (!arg) {
    sendCommandResponse(command.response_url, t('messages.domain.noargs'))
  } else {
    const user = await getUserRecord(command.user_id)
    if (user.customDomain != null) {
      console.log('DOMAIN ALREADY SET')
      const prevDomain = user.customDomain
      const response = await fetch(
        `https://api.vercel.com/v1/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/alias?domain=${prevDomain}&teamId=${TEAM_ID}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
          }
        }
      )
      .then(res => res.json())
      console.log(response)
    }

    const vercelFetch = await fetch(
      `https://api.vercel.com/v9/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/domains?teamId=${TEAM_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
        },
        body: JSON.stringify({
          name: arg
        })
      }
    )
      .then((r) => r.json())
      .catch((err) => {
        console.log(`Error while setting custom domain ${arg}: ${err}`)
      })
    console.log(vercelFetch)
    if (vercelFetch.error) {
      sendCommandResponse(
        command.response_url,
        t('messages.domain.domainerror', {
          text: arg,
          error: JSON.stringify(vercelFetch.error)
        })
      )
    } 
    // domain is owned by another Vercel account, but we can ask the owner to verify 
    else if (!vercelFetch.verified) {
      console.log(vercelFetch.verification)
      if (!vercelFetch.verification) {
        sendCommandResponse(
          command.response_url,
          t('messages.domain.domainerror', {
            text: arg,
            error: "No verification records were provided by the Vercel API"
          })
        )
      }
      const record = vercelFetch.verification[0]
      const recordText = `type: \`${record.type}\`
domain: \`${record.domain}\`
value: \`${record.value}\``
      sendCommandResponse(
        command.response_url,
        t('messages.domain.domainverify', {
          text: recordText,
          domain: arg,
        })
      )
    } else {
      await prisma.accounts.update({
        where: { slackID: user.slackID },
        data: { customDomain: arg }
      })
      sendCommandResponse(
        command.response_url,
        t('messages.domain.domainset', { text: arg })
      )
    }
  }

  res.status(200).end()
}
