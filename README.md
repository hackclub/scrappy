# Scrappy the Slack Bot

![build](https://github.com/hackclub/scrappy/workflows/build/badge.svg)

Scrappy is the Slack bot that powers [scrapbook.hackclub.com](https://scrapbook.hackclub.com). Scrappy automatically generates your Scrapbook and Scrapbook posts via Slack messages. For more information about how to sign up,

[Click here to view the Scrapbook repository](https://github.com/hackclub/scrapbook), which hosts the Scrapbook web code.

## Commands
Scrappy provides some helpful commands in Slack. These commands are also documented in our Slack if you send the message `/scrappy` in any channel.

- `/scrappy-togglestreaks`: toggles your streak count on/off in your status
- `/scrappy-togglestreaks all`: opts out of streaks completely
- `/scrappy-open`: opens your scrapbook (or another user's if you specify a username)
- `/scrappy-setcss`: adds a custom CSS file to your scrapbook profile. Check out this cool example!
- `/scrappy-setdomain`: links a custom domain to your scrapbook profile, e.g. [https://zachlatta.com](https://zachlatta.com)
- `/scrappy-setusername`: change your profile username
- `/scrappy-setaudio`: links an audio file to your Scrapbook. [See an example here](https://scrapbook.hackclub.com/matthew)!
- `/scrappy-setwebhook`: create a Scrappy Webhook we will make a blank fetch request to this URL every time you post
- `/scrappy-webring`: adds or removes someone to your webring
- *Remove* a post: delete the Slack message and Scrappy will automatically update for you
- *Edit* a post: edit the Slack message and it will automatically update for you

## Contributing

Contributions are encouraged and welcome! There are two GitHub repositories that contain code for Scrapbook: the [Scrapbook website](https://github.com/hackclub/scrapbook#contributing) and [Scrappy the Slack bot](https://github.com/hackclub/scrappy#contributing). Each repository has a section on contributing guidelines and how to run each project locally.

Development chatter happens in the [#scrappy-dev](https://app.slack.com/client/T0266FRGM/C01NQTDFUR5) channel in the [Hack Club Slack](https://hackclub.com/slack/).

## Running locally
In order to run Scrappy locally, you'll need to [join the Hack Club Slack](https://hackclub.com/slack). From there, ask @sampoder to be added to the `scrappy (dev)` app on Slack.

1. Clone this repository
   - `git clone https://github.com/hackclub/scrappy.git && cd scrappy`
1. Install [ngrok](https://dashboard.ngrok.com/get-started/setup) (if you haven't already)
   - Recommended installation is via [Homebrew](https://brew.sh/)
   - `brew install ngrok`
1. Install dependencies
   - `yarn`
1. Create `.env` file at root of project
   - `touch .env`
   - Ask `@sampoder` for the `.env` file contents
1. Link your `.env` with your prisma schema
   `npx prisma generate`
1. Start server
   - `yarn dev`
1. Forward your local server to ngrok
   - `ngrok http 3000`

Those with access to HQ's Heroku account can also create their own `.env` file:

- Install Heroku's CLI (if you haven't already)
   - `brew install heroku`
- Link Heroku to your account
   - `heroku login`
- View environment variables from Heroku
   - `heroku config --app scrappy-hackclub`
- Copy these into your `.env` file, formatted like:
```
  PG_DATABASE_URL="insert value here"
  SLACK_BOT_TOKEN="insert value here"
```
