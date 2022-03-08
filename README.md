# Scrappy the Slack Bot

![build](https://github.com/hackclub/scrappy/workflows/build/badge.svg)

The Slack bot that powers [scrapbook.hackclub.com](https://scrapbook.hackclub.com).

## Commands
Scrappy not only handles the automatic generation of things, but provides some helpful commands as well. These commands are also documented in our Slack if you send the message `/scrappy` in any channel.

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

Development chatter happens in the [#scrapbook-dev](https://app.slack.com/client/T0266FRGM/C035D6S6TFW) channel in the [Hack Club Slack](https://hackclub.com/slack/).

## Running locally
In order to run Scrappy locally, you'll need to [join the Hack Club Slack](https://hackclub.com/slack). To get started developing, ask @sampoder to be added to the `scrappy (dev)` app on Slack and for a `.env` file.

1. Clone this repository
   - `git clone https://github.com/hackclub/scrappy.git && cd scrappy`
1. Install dependencies
   - `yarn`
1. Ask `@sampoder` for the `.env` file
1. Start server
   - `yarn dev`
1. View your server
   - `open http://localhost:3000/`

then use `ngrok` to forward your local instance onto the world wide web.

---

[learn more about how to get started](https://scrapbook.hackclub.com/about)
