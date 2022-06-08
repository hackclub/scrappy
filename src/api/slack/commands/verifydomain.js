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
  const arg = args[0] === 'verifydomain' ? args[1] : args[0]
  const user = await getUserRecord(command.user_id)
  if (!arg) {
    sendCommandResponse(command.response_url, t('messages.domain.noargs'))
  }

  const vercelFetch = await fetch(
    `https://api.vercel.com/v9/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/domains/${arg}/verify?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
      },
    }
  )
    .catch((err) => {
      console.log(`Error while verifying custom domain ${arg}: ${err}`)
    })
  const vercelFetchResponse = await vercelFetch.json()
  if (vercelFetch.status == 200) {
    await prisma.accounts.update({
      where: { slackID: user.slackID },
      data: { customDomain: arg }
    }) 
    sendCommandResponse(
      command.response_url,
      t('messages.domain.domainverified', { text: arg })
    )
  } else {
    console.log(vercelFetchResponse.error)
    if (vercelFetchResponse.error.code == 'domain_does_not_exist') {
      sendCommandResponse(
        command.response_url,
        t('messages.domain.domaindoesnotexist', {
          text: arg,
          error: vercelFetchResponse.error.message
        })
      )
    } else {
      sendCommandResponse(
        command.response_url,
        t('messages.domain.domainverifyerror', {
          text: arg,
          error: vercelFetchResponse.error.message
        })
      )
    }
  }
  res.status(200).end()
}
