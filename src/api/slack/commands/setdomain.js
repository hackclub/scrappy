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
      await fetch(
        `https://api.vercel.com/v1/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/alias?domain=${prevDomain}&teamId=${TEAM_ID}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
          }
        }
      )
    }

    const vercelFetch = await fetch(
      `https://api.vercel.com/v1/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/alias?teamId=${TEAM_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
        },
        body: JSON.stringify({
          domain: arg
        })
      }
    )
      .then((r) => r.json())
      .catch((err) => {
        console.log(`Error while setting custom domain ${arg}: ${err}`)
      })
    console.log(vercelFetch)
    // domain is owned by another Vercel account, but we can request a delegation
    if (vercelFetch.error?.code === 'forbidden') {
      sendCommandResponse(
        command.response_url,
        t('messages.domain.debug', {
          error: JSON.stringify(vercelFetch.error)
        })
      )
      const delegationReq = await fetch(
        `https://api.vercel.com/v6/domains/${arg}/request-delegation?teamId=${TEAM_ID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
          }
        }
      )
        .then((r) => r.json())
        .catch((err) => {
          console.log(`Error while delegating custom domain ${arg}: ${err}`)
        })

      if (delegationReq.error) {
        // something went wrong, such as the domain being an apex domain
        sendCommandResponse(
          command.response_url,
          t('messages.domain.domainerror', {
            text: arg,
            error: JSON.stringify(delegationReq.error)
          })
        )
      } else {
        // successfully requested delegation
        sendCommandResponse(
          command.response_url,
          t('messages.domain.domaindelegated', {
            text: arg
          })
        )
      }
    } else if (vercelFetch.error) {
      sendCommandResponse(
        command.response_url,
        t('messages.domain.domainerror', {
          text: arg,
          error: JSON.stringify(vercelFetch.error)
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
