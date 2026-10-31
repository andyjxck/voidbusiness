// Single source for the Privacy Policy, Terms of Use, Transparency notes and
// Acknowledgements. Used by the in-app Policies screen and by
// scripts/build-legal-pages.js, which writes docs/privacy.html,
// docs/terms.html, PRIVACY_POLICY.md and TERMS_OF_USE.md from the same text.
// Keep it accurate to what the app actually does, and bump
// LEGAL_LAST_UPDATED in src/config/legal.js whenever it changes.
//
// Plain JS (no React Native imports) so Node can require it via Babel.

const { SUPPORT_EMAIL, APP_NAME, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } = require('../config/legal');
const { OFL_TEXT, NOTO_COPYRIGHT } = require('./licenses');

const APPLE_STANDARD_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const GOOGLE_ADMOB_DISCLOSURE_URL = 'https://developers.google.com/admob/ios/privacy/data-disclosure';
const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy';
const APPLE_PRIVACY_URL = 'https://www.apple.com/legal/privacy/';

const PRIVACY = [
  { title: 'Who we are', body: `${APP_NAME} is a single-player game published by an independent developer trading as AndySocial ("we", "us"). We are the data controller for the limited processing described in this policy.

Contact: ${SUPPORT_EMAIL}` },
  { title: 'The short version', body: `There are no accounts and we run no servers. Your game stays on your device and, if iCloud is on, in your own iCloud. The only other parties involved are Apple, which handles purchases and iCloud, and Google, whose AdMob SDK serves the optional rewarded ads. We do not run analytics or crash reporting of our own.` },
  { title: 'What stays on your device', body: `• Game data: your balance, businesses, investments, collections, purchases, settings and stats.
• Names you type: names you give your games, films, businesses and similar items are saved only on your device (and in your own iCloud save if iCloud is on). They are never sent to us, to Google or to anyone else.

We cannot see any of this data.` },
  { title: 'iCloud', body: `If iCloud is enabled for ${APP_NAME} on your device, a copy of your save is stored in your private iCloud key-value store under your Apple Account so it can sync between your devices. Apple holds it under Apple's privacy policy. We cannot see, access or retrieve it.` },
  { title: 'Purchases', body: `Apple processes all payments for in-app purchases and the VIP subscription. Apple tells the app which product you bought and whether your subscription is active, and the app stores that on your device. We never see your name, Apple Account details or card details.` },
  { title: 'Ads (Google AdMob)', body: `${APP_NAME} shows rewarded video ads only. An ad plays only when you choose to watch one in exchange for an in-game reward. There are no banner or pop-up ads.

• Google's Mobile Ads SDK starts when the app launches. For players without VIP, the app then loads one rewarded ad in advance so it is ready if you choose to watch it. For VIP members the app does not load or show ads, but the SDK still starts at launch.
• The app requests non-personalised ads only. Google does not use your activity in this app to personalise ads.
• The app never asks for permission to track you, so iOS does not give the app or Google your advertising identifier (IDFA).
• As Google discloses for its Mobile Ads SDK, Google may collect your IP address (which can indicate your general location), app- or developer-scoped device identifiers, how you interact with ads and the app (such as launches, taps and video views), and diagnostic information such as crash logs and performance data (for example launch time, hang rate and energy use). Google uses this to deliver ads, measure them, prevent fraud and improve its services.

Google's disclosure: ${GOOGLE_ADMOB_DISCLOSURE_URL}
Google's privacy policy: ${GOOGLE_PRIVACY_URL}` },
  { title: 'What we do not do', body: `• No accounts, sign-ins or profiles
• No analytics, crash reporting or telemetry of our own
• No tracking across other companies' apps or websites, and no advertising profiles
• No sale of personal data
• No servers of our own, so nothing is stored by us` },
  { title: 'Sharing and third parties', body: `Data is processed only by the companies needed to run the features described above:

• Apple: App Store payments, subscriptions and iCloud sync (${APPLE_PRIVACY_URL})
• Google: AdMob ad delivery and the diagnostics described above (${GOOGLE_PRIVACY_URL}). This may involve processing in the United States under appropriate UK GDPR transfer safeguards.

Any third party that receives user data from the app, including Apple and Google, must provide the same or equal protection of that data as stated in this policy and as required by Apple's App Store Review Guidelines. No one else receives data from the app.` },
  { title: 'Lawful bases (UK GDPR)', body: `• Contract: storing your game and purchase entitlements is necessary to provide the game you chose to use.
• Legitimate interests: showing optional, non-personalised rewarded ads that fund the free game, and Apple's and Google's fraud prevention and security.` },
  { title: 'Retention and deletion', body: `Game data stays until you delete it. Reset Progress in Settings deletes your progress on this device and clears the iCloud copy. Deleting the app removes the local copy. You can also remove the iCloud copy in iOS Settings > [your name] > iCloud > Manage Storage (or Storage).

Purchase records are kept by Apple under Apple's policies. Data collected by Google's SDK is kept under Google's policies.` },
  { title: 'Your rights', body: `Under UK GDPR you have the right to access, rectification, erasure, restriction, portability and to object to processing. Because your data lives on your device and in your own iCloud, you already hold it: you can reset it in Settings or delete the app at any time.

For anything else, email ${SUPPORT_EMAIL}. You can also complain to the UK Information Commissioner's Office (ico.org.uk).` },
  { title: 'Children', body: `The app is not directed at children and we do not knowingly collect personal information from them. Purchases are protected by Apple's parental controls and Ask to Buy.` },
  { title: 'Security', body: `Your game data leaves your device only through Apple's iCloud (encrypted in transit and at rest under your Apple Account) and the purchase and ad requests described above. No system is perfectly secure, but the app keeps its data footprint deliberately small.` },
  { title: 'Changes', body: `If this policy changes, the new version will appear in the app and at ${PRIVACY_POLICY_URL} with a new "last updated" date.` },
  { title: 'Contact', body: `Questions about privacy: ${SUPPORT_EMAIL}` },
];

const TERMS = [
  { title: 'Agreement', body: `These Terms of Use apply to ${APP_NAME}, published by an independent developer trading as AndySocial ("we", "us"). Your use of the app is also governed by Apple's Licensed Application End User License Agreement (the "Standard EULA"): ${APPLE_STANDARD_EULA_URL}. These terms add to the Standard EULA. If you do not agree, do not use the app.` },
  { title: 'The game', body: `${APP_NAME} is a single-player simulation game for entertainment. All companies, coins, products, people and news in the game are fictional. Nothing in the game is financial advice.` },
  { title: 'Virtual items', body: `In-game cash, businesses, upgrades, card skins and other items are virtual. They have no real-world monetary value, cannot be exchanged for money or real goods, and are licensed to you, not sold. We may adjust game balance at any time.` },
  { title: 'Purchases', body: `In-app purchases and the VIP subscription are billed by Apple to your Apple Account. Prices are shown in the app and confirmed by Apple before you pay. Refunds are handled by Apple under Apple's policies and your statutory rights. Use Restore Purchases in the shop to restore non-consumable purchases and an active subscription on a new device.` },
  { title: 'VIP subscription', body: `VIP is an auto-renewable subscription, available as VIP Monthly (1 month) and VIP Yearly (1 year). Payment is charged to your Apple Account when you confirm the purchase. The subscription renews automatically at the price shown for the same period unless you turn off auto-renew at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the end of the current period.

You can manage or cancel your subscription at any time in your Apple Account settings (iOS Settings > [your name] > Subscriptions). Cancelling stops future charges; VIP benefits continue until the end of the period you have paid for.

If the price changes, Apple notifies you under its standard rules and you can cancel before the new price applies.` },
  { title: 'Digital content and cancellations', body: `Under UK consumer law, when you buy digital content for immediate delivery you agree that supply begins immediately and you lose the 14-day cancellation right once delivery begins. Your statutory rights for faulty content are not affected.` },
  { title: 'Fair play', body: `Do not exploit bugs, tamper with the app or use automation to gain an advantage. We may reset progress gained through exploits.` },
  { title: 'Availability', body: `We may update, suspend or discontinue features. Where a paid entitlement is materially affected, you may be entitled to a proportionate refund under consumer law.` },
  { title: 'Liability', body: `Nothing in these terms excludes liability for death or personal injury caused by negligence, for fraud, or for any liability that cannot be excluded under law. Otherwise the app is provided "as is", and to the extent permitted by law we are not liable for loss of virtual progress caused by device failure or deletion.` },
  { title: 'Governing law', body: `These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction, without affecting any mandatory consumer rights where you live.` },
  { title: 'Privacy', body: `How the app handles data is explained in the Privacy Policy: ${PRIVACY_POLICY_URL}` },
  { title: 'Contact', body: `Questions about these terms: ${SUPPORT_EMAIL}` },
];

const TRANSPARENCY = [
  { title: 'In one paragraph', body: `Your game stays on your device. We have no servers, no accounts and no analytics of our own. Data leaves your device only in three ways: your iCloud save, which stays in your own Apple Account; Apple processing your purchases; and Google's AdMob SDK, which starts at launch and may collect diagnostics, and which serves a rewarded ad when you choose to watch one.` },
  { title: 'Where your save lives', body: `• On this device, always
• In your private iCloud key-value store, only if iCloud is on for this app
• Nowhere else

Reset Progress in Settings deletes both your progress on this device and the iCloud copy.` },
  { title: 'What Apple sees', body: `Apple processes App Store purchases and subscriptions as it does for every app. We only learn which product you bought, never your card or account details.` },
  { title: 'What Google sees', body: `Google's Mobile Ads SDK starts when the app opens and may collect diagnostic, crash and performance data, your IP address and app-scoped device identifiers, as Google discloses. The app requests non-personalised rewarded ads only and never asks to track you. VIP members are not shown ads and the app does not load ads for them.` },
  { title: 'What we see', body: `Nothing from inside the app. There is no analytics SDK or crash reporter of our own and no server to send anything to. We see only the aggregate sales reports Apple gives every developer.` },
  { title: 'Names you type', body: `Names you give your games, films and businesses stay on your device and in your own iCloud save. They are never uploaded anywhere else.` },
  { title: 'Questions', body: `${SUPPORT_EMAIL}` },
];

const ACKNOWLEDGEMENTS = [
  { title: 'Noto Color Emoji', body: `${APP_NAME} includes the Noto Color Emoji font. ${NOTO_COPYRIGHT}

${OFL_TEXT}` },
  { title: 'Open-source software', body: `${APP_NAME} is built with React Native, Expo and other open-source libraries, each used under its own licence (mostly MIT). Thank you to their authors.` },
];

module.exports = {
  PRIVACY,
  TERMS,
  TRANSPARENCY,
  ACKNOWLEDGEMENTS,
  APPLE_STANDARD_EULA_URL,
  TERMS_OF_USE_URL,
  PRIVACY_POLICY_URL,
};
