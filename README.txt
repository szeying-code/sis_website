SIS BIRTHDAY TO-DO LIST
=======================

A password-protected birthday checklist that the whole family shares. Everyone
who knows the password sees the same list, and it updates about every 4 seconds
while the page is open. It is an installable web app (PWA), not a native iOS app.

Live site: https://szeying-code.github.io/sis_website/


FILES (all of them go in the ROOT of the repository)
----------------------------------------------------
index.html            the page
style.css             the look
app.js                the logic (password screen, shared list, confetti)
config.js             ALL the wording, the starter tasks and the Supabase connection
sw.js                 service worker (caches the app files so the page shell opens offline)
manifest.webmanifest  app name, colours and icons for "Add to Home Screen"
icons/                icon-192.png and icon-512.png

Do not put the files inside an extra folder, and do not forget the icons folder.


HOW IT WORKS
------------
- The list is stored in Supabase. The browser only talks to it through server
  functions (RPC) that check the family password on the server. A wrong password
  never returns any data.
- The password is typed on the first visit and then saved in that browser's
  local storage so you stay signed in. The "Lock" button clears it.
- config.js contains the Supabase URL and the PUBLISHABLE key. That key is meant
  to be public. NEVER put a secret or service_role key anywhere in this site.
- The password itself is not in the code. It is set inside Supabase
  (see supabase-setup.sql, which is kept separately and is not part of this folder).


CHANGING THINGS
---------------
- Words, title, starter tasks: edit config.js on GitHub (pencil icon) and commit.
- "Start again" on the page resets the list for EVERYONE back to the starter
  tasks in config.js (it asks for confirmation first).
- Any change to a site file: also change CACHE_NAME in sw.js (v6 -> v7, and so
  on). The app files are served from the cache first, so phones keep showing the
  old version until that name changes.


PUBLISHING (GitHub Pages)
-------------------------
1. Upload all files and the icons folder to the root of the repository.
2. Commit to the branch used by GitHub Pages (Settings > Pages > Deploy from a
   branch > main > / (root)).
3. Wait about a minute for it to deploy.


INSTALLING ON AN IPHONE
-----------------------
1. Open the site in Safari (it must be the https:// link).
2. Tap Share > Add to Home Screen. If offered, turn on "Open as Web App", then Add.
3. Open it, type the family password once, and she is in.
After an update, if the old version still shows, close the app fully and reopen
it, or remove it and add it to the Home Screen again.


GOOD TO KNOW
------------
- Offline: the page itself opens offline after one online visit, but the list
  comes from Supabase, so ticking and adding tasks needs internet.
- Keep the password private: anyone who has it can edit the list.
- Choose a password that is not easy to guess. There is no limit on wrong tries.
- In Supabase, keep row-level security switched on for the tasks table, with no
  direct public access. Only the password-checking functions should be reachable.
