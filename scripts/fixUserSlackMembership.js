// This script fixes an issue where new Scrapbook accounts created after the Prisma migration (commit 48bc523) but before commit 9df84d1 were not assigned a fullSlackMember value.
// Make sure to run `yarn run build` and have the PG_DATABASE_URL environment variable set before running this script.
(async () => {
    require('dotenv').config()
    const { isFullMember } = require('../build/lib/api-utils.js');
    const { PrismaClient } = require('@prisma/client')
    let prisma = new PrismaClient()
    const users = await prisma.accounts.findMany({where: { fullSlackMember: null }})
    users.forEach(async (user) => {
        if (await isFullMember(user)) {
            prisma.accounts.update({where: { slackID: user.slackID }, data: { fullSlackMember: true }})
        }
    })
})()