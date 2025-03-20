# DisCo Zero

Would you like to play a game?

This game was created as a badge challenge alongside the DistrictCon hacker conference in Washington, DC in February 2025.


## Running Locally

1. OPTIONAL: [Create an SSL certificate for `localhost`](https://www.cloudzilla.ai/dev-education/how-to-get-ssl-https-for-localhost/). Put the decrypted key and crt in a `localcert` directory inside this project.
2. [Install Node.js](https://nodejs.org/en/download/) (check the `package.json` file to see what version the site runs on)
5. [Install and run Redis](https://redis.io/topics/quickstart)
6. Install the dependencies with `npm install`
7. Configure your environment variables by copying `.env.example` and renaming it to `.env`, then change the values to match your local environment!

Now you should be ready to run the application locally with `node .` (or use `npm run watch` to continuously watch for file changes and restart the app).


## Helpful Redis commands

Open CLI to heroku redis: `heroku redis:cli -a disco-game -c disco-game`

Get keys matching a pattern: `KEYS disco_code_1010*`

Add a new code to be used by a player: `SET disco_code_[UUID] ""`

Get a player's data: `GET disco_user_[handle]`
