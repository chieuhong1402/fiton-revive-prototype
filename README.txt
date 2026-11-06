FitOn Revive — clickable mobile prototype (static site, no build step)

Deploy to Vercel (2 minutes):
  1. Unzip this folder.
  2. In a terminal inside the folder run:   npx vercel deploy --prod
     (log in when asked; accept the defaults — no framework, no build command)
  3. Vercel prints the public URL.
  To make it open for anyone with the link: Vercel dashboard > Project > Settings > Deployment Protection > turn off Vercel Authentication.

Or drag the unzipped folder into https://vercel.com/new (choose "Other", no build command).
Preview locally:  python3 -m http.server  then open http://localhost:8000
