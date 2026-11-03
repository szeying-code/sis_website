Birthday to-do list: how to put it online (GitHub Pages)

1. On GitHub, click New repository. Name it something hard to guess (for example: ying-sis-birthday-2026). Choose Public. Click Create repository.
2. Click "uploading an existing file". Drag in these 4 files: index.html, style.css, app.js, config.js. Click Commit changes.
3. Go to Settings > Pages. Under "Build and deployment" choose "Deploy from a branch", pick main and "/ (root)", click Save.
4. After about a minute the link is https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/ . Send it to your sister.

To change the words or the starting tasks later: open config.js on GitHub, click the pencil icon, edit, then Commit changes.

Tips for your sister: open the link on her phone, then use "Add to Home Screen" so it opens like an app.
Her ticks and tasks are saved only on her own phone or browser. If she opens the link on another device, she gets the starting list again.


PWA UPGRADE (added)
-------------------
New files:
- manifest.webmanifest: app name, colours, standalone display and icon sizes.
- sw.js: caches the core website files so the site can open offline after
  the first successful visit.
- icons/icon-192.png and icons/icon-512.png: home-screen/app icons.

To publish:
1. Upload ALL files and the icons folder to the ROOT of your existing
   GitHub repository (do not put them inside an extra folder).
2. Commit the changes to the branch used by GitHub Pages.
3. Wait for GitHub Pages to deploy.
4. On iPhone, open the published HTTPS website in Safari.
5. Tap Share > Add to Home Screen.
6. If offered, enable "Open as Web App", then tap Add.

Important:
- This is an installable PWA, not a native iOS WidgetKit widget.
- Your existing task data still uses browser localStorage. It is NOT yet
  synchronised between family members or devices.
- Offline support applies after the first successful online visit.
- To publish future updates, change the CACHE_NAME in sw.js (for example v2)
  so devices refresh their cached app files.

SHARED FAMILY CHECKLIST (Supabase)
----------------------------------
This version uses Supabase RPC functions to store the checklist centrally.
Family members opening the shared link see the same list. The page checks for
changes about every 4 seconds while it is open.

The family access token is provided in the URL fragment (#key=...). The app
stores it in this browser's local storage and removes it from the address bar.
Do not post the family link publicly: anyone with it can edit the checklist.
The Supabase publishable key is intended for browser use; never add a Supabase
secret/service-role key to this site.

For first launch, open the special family link while online. If the shared
database is empty, the app seeds it with the existing local checklist (if
present) or the default tasks in config.js. Other devices then load the shared
list from Supabase.
