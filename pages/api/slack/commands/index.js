export default async (req, res) => {
  // Slack has strict requirements on response time, so let's set them back a success ASAP
  res.status(200).end()

  const { command } = req.body

  let method
  switch(command) {
    case '/devcss':
    case '/setcss':
      // call the setcss command async here...
      method = 'setcss'
      break
    case '/streaksdev':
    case '/summerstreaks':
      // call the streaksdev command async here...
      method = 'summerstreaks'
      break
    case '/setdomain':
      // call the setdomain command async here...
      method = 'setdomain'
      break
  }

  //                v- should be http or https, fallback to http just in case
  const protocol = (req.headers['x-forwarded-proto'] || 'http') + '://'
  const backendUrl = protocol + req.headers.host + '/api/slack/commands/' + method

  await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Passthrough': 'TRUE - Working around slack, see message.js for source'
    },
    body: JSON.stringify(req.body)
  })
}
