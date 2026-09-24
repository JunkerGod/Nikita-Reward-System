# Handover: Nikita's Rewards

**Site:** https://nikitas-rewards.netlify.app

**Logins** (username + password, set on each phone once):

- Jagath: username `jagath`
- Nikita: username `nikita`

On each phone, open the site in Safari or Chrome, log in, then use Share, then "Add to Home
Screen" to get the pink heart app icon.

Netlify shows a small "Powered by Netlify" badge at the bottom of free sites, which sits over
the tab bar. Open it and tap "Hide this badge" once on each phone; the phone remembers.

## Turning on notifications (once per phone)

1. Add the app to the Home Screen (Share, then Add to Home Screen) and open it from there.
2. More, Settings, Notifications, Turn On Notifications, then Allow.
3. Tap Send Test to check it buzzes.

## Linking the shared album (once)

In Photos, open the shared album, tap the people icon, then Copy Album Link (Sharing Options
must let anyone with the link see it). Then More, Settings, Photo memories, paste it and tap
Save Link. Photos added to the album
show up in More, Memories.

## Changing things without code

- Rewards and prices: Shop tab, Add Reward (Jagath only). Edit, Hide or Delete on each card.
- Activities and point values: More, Settings, Activities.
- Face photos: More, Settings, Face photos. Upload, crop into the oval, done.
- Backup: More, Settings, Export My Data (saves a JSON file). Worth doing now and then.
- Special days (birthdays, anniversary): More, Settings, Special days.

## If something ever breaks

1. **"Ugh that didnt save" or nothing loads.** Check the phone has internet, then close and
   reopen the app. Most problems are just a bad connection.
2. **Everything is broken for both of you.** Log in to https://supabase.com/dashboard and open
   the `nikitas-rewards` project. If it says **Paused**, click **Restore**. (The daily
   keep-alive should stop this happening, but this is the fix if it ever does.)
3. **The site itself won't open.** Log in to https://app.netlify.com, open `nikitas-rewards`,
   go to Deploys and click **Trigger deploy**.
4. **Forgot a password / want a new one.** In Supabase, open **SQL Editor** and run this
   (change the password and the name):

   ```sql
   update auth.users
   set encrypted_password = extensions.crypt('new-password-here', extensions.gen_salt('bf'))
   where email = 'nikita@nikitas-rewards.local';
   ```

5. **Notifications stopped.** On that phone: Settings, Notifications, Turn Off, then Turn On
   again. If the phone was reset or the app removed from the Home Screen, just turn them on again.
6. **Memories page says it cant load.** In Photos, check the album is still shared by link.
7. **Balance looks wrong.** More, History shows every entry. Delete the wrong one (it asks
   first) and the balance fixes itself.

## Checking the keep-alive

In Supabase, SQL Editor: `select * from heartbeat;` shows when it last ran (it runs once a
day, around midnight UTC) and how many times. In Netlify, Logs, Functions, `keep-alive` shows
the same.

## Where things are

- Code: GitHub, `JunkerGod/Nikita-Reward-System`
- Database, logins, photos: Supabase project `nikitas-rewards` (Sydney)
- Hosting: Netlify project `nikitas-rewards`
