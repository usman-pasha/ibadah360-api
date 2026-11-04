# Ibadah360

Prayer tracker for Muslims in India (Bengaluru, Karnataka by default). Built with Node.js, Express and MongoDB.

## How it is built
**The backend does everything.** The website is only a thin screen that shows what the API sends, so a future
Android / iOS app can use exactly the same API.

| What | Where it lives |
| --- | --- |
| Accounts, login, forgot password, profile, settings | MongoDB (`users`) + `/api/auth`, `/api/profile` |
| Prayer marks (on time, qaza, voluntary), streaks, missed prayers | MongoDB (`prayers`) + `/api/prayers` |
| Rules (on time locked, only today, not before prayer time, qaza only for past days) | `routes/prayers.js` |
| Prayer times (downloaded once per city and day, then saved) | `services/times.js`, MongoDB (`timescaches`) |
| Islamic calendar, Eid and other dates | `services/hijri.js`, MongoDB (`hijrievents`) |
| Quran (all surahs, Indian + Madani script, 6 translations) | `services/quran.js`, MongoDB (`surahs`, `ayahs`) |
| Duas, ayah of the day, prayer names and tips | MongoDB (`duas`, `dailyayahs`, `prayerdefs`) |
| About us | MongoDB (`abouts`) |
| Usernames, bios, public / private accounts, follows and follow requests | MongoDB (`users`, `follows`) + `/api/users`, `/api/follow`, `services/social.js` |

## Setup
1. Install Node.js 18 or newer and MongoDB (or use a free MongoDB Atlas link).
2. `npm install`
3. Copy `.env.example` to `.env` and set `MONGO_URI` and a long random `JWT_SECRET`.
4. `npm start` and open http://localhost:3000

The first start saves the default content (duas, Islamic events, prayer names, About us) in MongoDB.

## Commands
- `npm start` runs the server.
- `npm run seed` resets all app content in MongoDB to the defaults in `/seed` (edit `seed/aboutSeed.js` for your team details first).
- `npm run seed:quran` downloads the whole Quran into MongoDB. Optional: without it each surah is downloaded the first time someone opens it. Needs internet on the server. Safe to run again.

## Your brand logo
Save your image as `public/logo.png`. For a mobile app, use the same image in the app.

## Settings for India
New accounts start with city Bengaluru, state Karnataka, Hanafi Asr, Karachi method and Islamic dates 1 day behind
Saudi Arabia. Each user changes these in My profile. All options come from `config/options.js`.

## Forgot password
- Testing: leave `SMTP_HOST` empty. The reset link is printed in the terminal.
- Real email: fill the `SMTP_*` values and set `APP_URL` to your website address.

## API for the mobile app
Base URL: your server, for example `https://ibadah360.example.com/api`. CORS is on.
Send `Authorization: Bearer <token>` (from login) and `X-TZ-Offset: <minutes>` (the phone's `getTimezoneOffset`;
default is India, -330). Every response is JSON. Errors look like `{ "message": "..." }`.

| Method and path | What it returns or does |
| --- | --- |
| GET `/health` | Server and database status |
| GET `/meta` | App options: prayer names, voluntary prayers, Quran languages and scripts, settings choices (no login) |
| POST `/auth/register` `{name,email,password}` | Creates account, returns `{token,name}` |
| POST `/auth/login` `{email,password}` | Returns `{token,name}` |
| POST `/auth/forgot` `{email}`, POST `/auth/reset` `{token,password}` | Forgot password |
| GET / PUT `/profile` | Name, email, mobile, settings. PUT `{name,phone}` |
| PUT `/profile/settings` | `{city,state,madhab,method,hijriAdj}` |
| POST `/profile/password` | `{current,next}` |
| GET `/prayers/today` | Whole Today screen: date, Hijri date, 5 prayers with allowed `actions`, voluntary prayers, streak |
| GET `/prayers/day/:date` | Same for any date (`YYYY-MM-DD`) |
| GET `/prayers/month/:YYYY-MM` (or `current`) | Calendar month with a `level` for each day |
| GET `/prayers/missed?page=&limit=` | Missed prayers (last 60 days), paged |
| GET `/prayers/stats` | Streaks and totals, ready to display |
| POST `/prayers/:date/mark` `{prayer,status:"ontime"\|"qaza"}` | Mark a prayer |
| POST `/prayers/:date/undo` `{prayer}` | Remove a qaza mark |
| POST `/prayers/:date/nafl` `{prayer}` | Mark a voluntary prayer |
| GET `/times` | Prayer times, next prayer and countdown |
| GET `/hijri/today`, `/hijri/month?offset=0`, `/hijri/upcoming?limit=8` | Islamic calendar |
| GET `/quran/surahs` | List of 114 surahs |
| GET `/quran/surah/:n?page=&limit=&script=indopak\|uthmani&lang=en\|ur\|hi\|bn\|ta\|ml\|none` | Ayahs, paged |
| GET `/quran/ayah-of-the-day?shift=&script=&lang=` | Ayah of the day |
| GET `/duas?search=&page=&limit=`, GET `/duas/today` | Duas |
| GET `/about` | About us |
| PUT `/profile` `{name,phone,username,bio}` | Edit the profile (username is unique) |
| PUT `/profile/privacy` `{isPrivate:true\|false}` | Private or public account. Going public accepts waiting requests |
| GET `/users/search?q=&page=&limit=` | Search people by name or username (min 2 letters) |
| GET `/users/:username` | A person's profile card, counts, how you are connected, and `canViewConnections` |
| POST / DELETE `/users/:username/follow` | Follow (instant for public, a request for private) / unfollow or cancel request |
| GET `/users/:username/followers`, `/following` | Lists. Private accounts: only the owner and accepted followers (otherwise 403) |
| GET `/follow/summary` | `{followers, following, requests}` for the menu badge |
| GET `/follow/requests` | Follow requests waiting for you |
| POST `/follow/requests/:username/accept`, DELETE `/follow/requests/:username` | Accept or delete a request |
| DELETE `/follow/followers/:username` | Remove one of your followers |

## If something does nothing
1. Stop the server (Ctrl+C) and run `npm start` again.
2. Refresh the page with Ctrl+F5.
3. Read the terminal. Server errors are printed there.

## Social (Instagram style)
- Every account has a unique username (made from the email at sign up, changeable in My profile), a bio, and a public or private setting.
- **Public:** anyone can follow instantly and see the follower and following lists.
- **Private:** following sends a request. The owner confirms or deletes it. Only approved followers see the lists.
- Everyone can open a profile card (name, username, bio, counts, member since). Email, phone, city and prayer data are never shown to other people.
- Accounts made before this version get a username automatically when the server starts.
