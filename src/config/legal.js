// CommonJS on purpose: scripts/build-legal-pages.js requires it from Node.
// ---------------------------------------------------------------------------
// LEGAL LINKS AND CONTACT - the one place to change them.
//
// TODO(before release): confirm these URLs. They are placeholders until the
// pages generated in docs/ (privacy.html, terms.html) are published at exactly
// these addresses. The same Privacy Policy URL must be entered in App Store
// Connect (App Privacy > Privacy Policy URL), and the Terms of Use URL in the
// App Store description or the EULA field.
// ---------------------------------------------------------------------------

const PRIVACY_POLICY_URL = 'https://andysocialapps.website/voidbusiness/privacy';
const TERMS_OF_USE_URL = 'https://andysocialapps.website/voidbusiness/terms';

// Contact address used in the app and in every policy (matches the address
// on the website's policies page).
const SUPPORT_EMAIL = 'andy@theandysocial.website';

// Date shown as "Last updated" on the Privacy Policy and Terms of Use.
const LEGAL_LAST_UPDATED = 'October 30, 2026';

const APP_NAME = 'Void Business';

module.exports = {
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
  SUPPORT_EMAIL,
  LEGAL_LAST_UPDATED,
  APP_NAME,
};
