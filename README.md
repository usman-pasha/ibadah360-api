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
| Quran (all surahs, Indian + Madani script, 6 translations), read by para or surah | `services/quran.js`, `services/para.js`, MongoDB (`surahs`, `ayahs`, `paras`) |
| Where each person stopped reading, plus script, translation, text size and reciter | MongoDB (`readingprogresses`) + `/api/quran/progress` |
| Every ayah read, and ayahs read per day | MongoDB (`readayahs`, `readingdays`) |
| Learning path: lessons, quizzes, progress | `services/learn.js`, MongoDB (`lessons`, `lessonprogresses`) |
| Dashboard and progress report | `routes/dashboard.js`, `services/report.js` |
| Tasbih, zakat, masjids | `routes/tasbih.js`, `routes/zakat.js`, `services/places.js`, MongoDB (`tasbihstates`, `tasbihdays`, `zakatrecords`, `placecaches`) |
| Badges, qaza goal, Ramadan | `services/badges.js`, `services/qaza.js`, `services/ramadan.js`, MongoDB (`badges`, `userbadges`, `qazaplans`, `qazalogs`, `ramadandays`) |
| Profile (public) and Account (private) | `routes/profile.js` and `routes/account.js` |
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
| GET `/quran/surah/:n?page=&limit=&script=indopak\|uthmani&lang=en\|ur\|hi\|bn\|ta\|ml\|none&at=150` | Ayahs, paged |
| GET `/quran/ayah-of-the-day?shift=&script=&lang=` | Ayah of the day |
| GET `/duas?search=&page=&limit=`, GET `/duas/today` | Duas |
| GET `/about` | About us |
| GET / PUT `/profile` | **Profile** (public): name, username, bio, counts. PUT `{name,username,bio}` |
| GET / PUT `/account` | **Account** (private): email, mobile, privacy, namaz settings. PUT `{phone}` |
| PUT `/account/privacy` `{isPrivate:true\|false}` | Private or public account. Going public accepts waiting requests |
| PUT `/account/settings` | `{city,state,madhab,method,hijriAdj}` |
| POST `/account/password` | `{current,next}` |
| GET `/quran/paras` | The 30 paras with start, end and ayah count |
| GET `/quran/para/:n?page=&limit=&script=&lang=&at=4:30` | Ayahs of a para, across surahs, paged. `at` opens the page holding that ayah |
| GET `/quran/locate?surah=&ayah=` | Which para holds this ayah |
| GET / PUT `/quran/progress` | Where the person stopped (`mode`, `surah`, `ayah`), their script, translation, text size, `reciter`, `autoNext`. PUT `read:[{surah,from,to}]` counts ayahs as read |
| POST `/auth/google` `{credential}` | Sign in with a Google ID token. Returns `{token,name,username}` |
| GET `/tasbih`, POST `/tasbih/count` `{add}`, PUT `/tasbih/select` `{key,target?}`, POST `/tasbih/reset` | Tasbih counter |
| GET `/zakat`, POST `/zakat/calculate` | Zakat calculator and saved results |
| GET `/places/masjids?lat=&lng=&radius=` | Nearby masjids (without lat and lng, the saved city is used) |
| GET `/badges` | Badges earned and still to earn. `newlyEarned` lists ones earned by this call |
| GET `/qaza`, PUT `/qaza/setup`, POST `/qaza/pray` `{prayer,count}`, POST `/qaza/undo` `{prayer}` | Qaza goal |
| GET `/ramadan`, POST `/ramadan/day` `{date?,fasted,reason?,taraweeh?}`, POST `/ramadan/qada` `{add:1\|-1}` | Ramadan mode |
| GET `/dashboard` | The whole home screen in one request |
| GET `/report?range=week\|month\|year\|all` | The complete progress report |
| GET `/learn` | The learning path: 4 levels, every lesson with progress, next lesson |
| GET `/learn/lessons/:key` | One lesson: text, practice drills, progress |
| GET / POST `/learn/lessons/:key/quiz` | 5 new questions / send `{answers:[{q,pick}]}` to be graded |
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

## Quran script (Naskh)
The Quran opens in the **Naskh** script (the style of most printed Qurans), drawn with the Amiri Quran font from Google Fonts.
The Indian (Indo-Pak) script is still in the Script style choice. Existing readers are moved to Naskh once, when the server starts.

## Tools
- **Tasbih counter:** pick a dhikr (SubhanAllah, Alhamdulillah, Allahu Akbar, La ilaha illallah, Astaghfirullah, Durood, La hawla), count with a big tap button, finish rounds, and see today, this week and all time. Dhikr list: `dhikrs` in MongoDB.
- **Zakat calculator:** gold, silver, cash, bank, investments, business stock, money owed to you and your debts. You enter today's gold and silver price per gram. The nisab is 612.36 g of silver (or 87.48 g of gold) and the rate is 2.5%. Your last inputs and results are saved. It is a guide, not a fatwa.
- **Nearby masjids:** a map and list from OpenStreetMap, using your location or your saved city. Needs internet. Masjids that nobody added to OpenStreetMap will not appear.

## Sign in with Google
1. In Google Cloud Console create an OAuth client ID of type **Web application**.
2. Add your website address (for example `http://localhost:3000` and your real domain) under **Authorized JavaScript origins**.
3. Put the Client ID in `.env` as `GOOGLE_CLIENT_ID=` and restart. The Google button then appears on the login page.
The server checks the Google token itself with Node crypto (`utils/googleToken.js`), so no extra npm module is needed. After this update you can run `npm uninstall google-auth-library` if it is in your node_modules.
A Google account with the same email as an existing account is linked to it. People who sign in with Google can set a password later in Account.

## Achievements, Qaza goal and Ramadan
- **Achievements:** 28 badges and milestones such as "30 days all on time", 100 prayers on time, 10 paras finished, 1000 dhikr, first fast. They are in MongoDB (`badges`) and earned automatically (`userbadges`).
- **Qaza goal:** enter how many qaza prayers you owe of each prayer, set a daily goal, tap +1 each time you pray one. Shows what is left, a finish date and the last 14 days.
- **Ramadan mode:** turns on by itself in Ramadan (using your moon sighting setting). Sehri and iftar times with a countdown, a fasting tracker for each day with the reason if you did not fast, Taraweeh rakats, and a count of fasts to make up.
- **Weekly and monthly charts:** the Progress report shows the last 8 weeks and the last 12 months.

## Dashboard and progress report
- **Dashboard** is the home screen: next prayer with countdown, prayers today, this week, Quran progress, learning progress, people and the next Islamic date. One request: `GET /api/dashboard`.
- **Progress report** (`GET /api/report?range=week|month|year|all`): on time and qaza percentages, streaks, each prayer, voluntary prayers, Quran ayahs read, paras and surahs finished, and learning progress. It can be printed or saved as PDF.
- A page of the Quran counts as read after it has been on screen for 6 seconds. This is saved per ayah (`readayahs`) and per day (`readingdays`).

## Quran Book
Two styles, chosen at the top of the screen:
- **Print (Nastaleeq, 15 lines):** pictures of a printed Indo-Pak Quran, 610 pages, in `public/mushaf/001.webp` to `610.webp` (unzip `mushaf-pages.zip` into the project root). Tap an ayah number under the page for its Arabic, translation and audio. The server learns which ayahs are on each picture from quran.com (Indopak 15 lines list), checks them against facts read from the scanned book (`ANCHORS` in `config/mushaf.js`), and saves them in MongoDB (`mushafpages`, `mushafindexes`). Run `npm run check:mushaf` once to confirm the lists match.
- **Text (Madani):** the Quran as text, 604 pages, laid out by the app.
Swipe right or tap the left arrow for the next page. Jump by surah, juz or page number. Bookmarks (kept separately for each style), night mode, audio for the page, and a page counts as read after 6 seconds. API: `GET /api/book/index`, `/page/:n`, `/progress`, `/bookmarks`, `/ayah/:surah/:number`, all with `?layout=print` or `?layout=text`.
Check that you are allowed to publish the scanned pages before putting the website online.

## Quran audio
Every ayah has an `audio` link in the Quran API. Files stream from the islamic.network CDN (ayah numbers 1 to 6236 are worked out by the server).
Choose the reciter and "Keep playing" in the Quran reader. Reciters are in `config/audio.js`. If one does not play, change its `bitrate` there.

## Learn Quran (Noorani Qaida to the complete Quran)
Four levels, saved in MongoDB (`lessons`) and built in `seed/learnSeed.js`:
1. **Noorani Qaida:** letters, joined letters, harakat, tanween, standing vowels, madd letters, leen, sukoon, shaddah.
2. **Tajweed rules:** noon sakin and tanween, meem sakin, ghunna, laam, heavy and light letters, madd types, qalqalah, stopping marks.
3. **Al-Fatiha and Juz Amma:** 38 surahs. A surah is finished when 95% of it has been read in the reader.
4. **The complete Quran:** 30 paras, finished by reading.
Levels 1 and 2 end with a 5 question quiz made fresh each time. 4 out of 5 finishes the lesson. The server checks the answers.
Please ask a qualified teacher to review the lesson text before you publish it.

## People
Find people and Follow requests are in one screen (two tabs). The menu badge shows waiting requests.

## Reading the Quran by para
Choose Para (Juz) or Surah. Your place is saved automatically on the server, so the Quran opens where you stopped on any device.
Switching between para and surah keeps the same ayah. The 30 para starts are in `seed/contentSeed.js` (standard Madani division).

## Profile and Account
- **My profile** is what other people see: name, username, bio, followers and following. Edit it with the Edit profile button.
- **Account** is private: email, mobile number, public or private switch, namaz time settings and password.
