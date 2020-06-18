export default async (req, res) => {
  console.log(req.body)
  await res.status(200).end()
}