Do these steps in order for each new release:

1. Change the version first
In desktop/package.json, raise "version" to a number above the last one, for example 1.2.1 → 1.2.2. Use 1.3.0 for new features and 1.2.2 for small fixes.

2. Build


cd tools/chrome_link_opener/desktop
npm run dist
The installer is created at dist/Barmeto Link Opener Setup 1.2.2.exe. The version in the file name always comes from package.json, so if the name doesn't show your new number, step 1 didn't save.

3. Upload
In the admin panel, go to Settings → Desktop App Releases and upload that .exe. Type exactly the same version (1.2.2) and make it the live release.

4. Done
Installed apps on any other version will show the update popup. Once a user installs the new build, its version matches the live one and the popup goes away.

Rules

Never rename the .exe to change its version. The app reports the number in package.json, not the file name, and a mismatch causes the endless update loop.
The version you type in the admin panel must match package.json exactly.
You can't upload a version number twice, so always go higher.
When you need a new build
The desktop app loads the website (https://link-opener.barmeto.com) inside its window. So:

Changes to pages, components or API routes (anything outside desktop/): just deploy the website. No new desktop build is needed, and users get the change right away.
Changes inside desktop/ (src/main.js, src/preload.js, the icon or the build settings): these need a new build, using the steps above.