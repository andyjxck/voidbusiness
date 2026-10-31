# Hosted legal pages

`privacy.html` and `terms.html` are standalone pages (no external CSS, fonts or
scripts). Upload them so they are reachable at the URLs in
`src/config/legal.js`:

- Privacy Policy: `PRIVACY_POLICY_URL` (currently https://andysocialapps.website/voidbusiness/privacy)
- Terms of Use: `TERMS_OF_USE_URL` (currently https://andysocialapps.website/voidbusiness/terms)

If you host them somewhere else, change the two constants, run
`npm run legal:build` to regenerate these files (the footer links come from the
same constants), and rebuild the app.

The text comes from `src/data/legalText.js`, which the app's Policies screen
also uses, so the website and the app always say the same thing.
