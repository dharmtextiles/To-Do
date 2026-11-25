TEAM TO DO  (master + members, mobile friendly)
Files: index.html (the app), Code.gs (server), manifest.webmanifest, sw.js, icons.
After setup you only ever edit index.html (app) or Code.gs (server).

A) SERVER (5 minutes, uses YOUR Google account)
 1. script.google.com > New project > delete the sample code > paste all of Code.gs.
 2. Set MASTER_EMAIL = your Gmail. (GOOGLE_CLIENT_ID is already filled in.)
 3. Pick function "setup" > Run > allow permissions (creates team-todo-db.json in your Drive).
 4. Deploy > New deployment > type Web app > Execute as: Me > Who has access: Anyone > Deploy.
 5. Copy the Web app URL (ends with /exec).
 After any later change to Code.gs: Deploy > Manage deployments > edit > New version.

B) APP
 1. Open index.html, paste the URL into APP.SERVER near the top of the script.
 2. Upload the whole folder to a GitHub repo > Settings > Pages (branch main, root).
 3. Google Cloud > Credentials > your OAuth client > Authorized JavaScript origins: add
    https://<your-username>.github.io   (no path, no slash at the end).
 4. Open the Pages link on phone or PC > sign in with the master Gmail > Install
    (iPhone: Share > Add to Home Screen).

C) USING IT
 - Master: Team tab > enter the member's Gmail + the name to show on tasks > Add member.
 - Members: open the link, "Sign in with Google" using that Gmail. They add/edit/complete tasks;
   their name is stored on every task they complete (taken from the verified Google login).
 - Only the master assigns tasks to other people and deletes tasks / removes members.
 - Backup: the live data file is Drive > team-todo-db.json. Menu > "Backup to Drive now" saves a dated copy
   in the folder "Team To Do Backups". For automatic daily backups: Apps Script > Triggers (clock icon) >
   Add trigger > function backup > Time-driven > Day timer.
 - Reminders/notifications work while the app is open or installed and running in the background.
