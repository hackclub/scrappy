import prisma from '../lib/prisma.js'
// Only runs when a user uploads a large video, to notify them when Mux processes the video
export default async (req, res) => {
  let updates = await prisma.accounts.findMany()
  res.status(200).json(updates)
}
