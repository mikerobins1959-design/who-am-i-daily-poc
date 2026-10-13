# Privacy notice: client release review

This is a draft for client review, not a legal certification or a publish-ready notice. Do not publish until the decisions below have been resolved and the public notice updated. The static production allowlist excludes this document.

## Verified implementation and instructions

- No account, application analytics, advertising scripts or application cookies. Local Storage holds daily progress/results and cumulative statistics; Session Storage controls the introduction; Cache Storage holds offline resources. The application does not upload game state.
- Share/copy uses browser APIs only after a player chooses it. Instagram and TikTok are ordinary external links; no social-platform embeds were found.
- Mike supplied `mickrobins@mac.com`, confirmed Netlify hosting, and instructed retention of support email while the game remains online.
- Company name, number and registered office match Companies House company 17299326. Director information is unnecessary for the public notice.

## Release checklist: decisions needed

- Confirm the controller is KRELL ENTERPRISES LTD and it authorises this notice/contact address.
- Confirm and document lawful bases for each personal-information purpose. Proposed for review: legitimate interests in reliable, secure delivery of the game and responding to support enquiries. Assess necessity, reasonable expectations and the balancing of individual rights before adopting this basis. Sending email does not itself establish consent. Privacy-rights handling may involve legal obligations; confirm the applicable basis separately.
- Confirm the hosting configuration, available access/security logs, recipients/subprocessors, operator access and actual retention/deletion periods. Do not infer the site's retention from Netlify's generic corporate privacy policy.
- Confirm whether hosting or email processing involves international transfers and state applicable destinations/adequacy or safeguards and how a user can obtain details. Do not promise UK-only processing or universal safeguards without evidence.
- Confirm the email provider, account arrangement and access controls. The supplied support email retention instruction is reflected faithfully in the draft. Consider periodically reviewing whether continuing to retain correspondence remains necessary and setting a shorter documented schedule; this is a proposal, not an agreed policy.
- Operational consideration: plan handling of privacy enquiries, verification where needed, rights requests, deletion and exceptions. No guaranteed process or timing is claimed.
- Verify any production hosting features added outside the repository (analytics, forms, plugins, injected scripts or headers) before relying on the no-tracking description. The browser/storage inspection describes the repository implementation.
- Review whether local storage/cache processing requires any additional disclosure or consent under applicable rules; no consent tooling was added because none was requested or established as necessary.
- Approve the final public content and complete desktop/mobile, keyboard and offline navigation checks before deployment.

The draft currently omits definitive lawful-basis and international-transfer statements until those facts are confirmed. Missing decisions must be resolved before release; the presence of a privacy page does not establish compliance.

Sources for review: [Companies House](https://find-and-update.company-information.service.gov.uk/company/17299326), [ICO right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/), [Netlify privacy](https://www.netlify.com/privacy/).

Netlify supplier evidence reviewed by the integrating owner: the current DPA (9 June 2026), section 14, describes processing outside the UK/EEA including the US, with EU–US Data Privacy Framework/UK extension and SCC/UK Addendum fallback mechanisms. This is supplier-level evidence, not confirmation of the client's actual contractual arrangement. See [Netlify Trust Center](https://www.netlify.com/trust-center/). The incorporation certificate confirms registration in England and Wales.
