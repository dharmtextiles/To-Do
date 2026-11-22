# Team To Do (Google Drive sync)
Edit only `index.html` (settings at top of its script). Host free on GitHub Pages, then install from the browser.

## Google Drive setup (once)
1. console.cloud.google.com -> new project -> APIs & Services -> Library -> enable **Google Drive API**.
2. OAuth consent screen: External, add every team member's Gmail under **Test users**.
3. Credentials -> Create OAuth client ID -> Web application -> Authorized JavaScript origins: `https://<user>.github.io`.
4. Paste the client ID into `googleClientId` in index.html and push.
5. One person signs in first (creates `team-todo-data.json` in their Drive), shares that file with the team's Gmail accounts as Editor. Others open the app, sign in, and it finds the shared file.
