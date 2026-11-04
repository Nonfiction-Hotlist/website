/**
 * Nonfiction Hotlist: website forms.
 *
 * The website's forms (the contact form on the home page, the newsletter box in the footer) send here.
 * For each entry it:
 *   - turns away spam (a hidden field people never fill in, and forms sent within 3 seconds of loading),
 *   - saves a row in the private "Website sign-ups" Sheet (in matthew@'s Drive, never in the kit folders,
 *     which are shared by link),
 *   - emails NOTIFY_EMAIL about contact form entries,
 *   - adds the person to the Brevo list, only if they asked to be (the tick box, or the newsletter box).
 * Brevo's key stays here, in this project's script properties; it never reaches the website.
 *
 * Setup (once, as matthew@nonfictionhotlist.com):
 *   1. Project Settings (gear) > Script properties:
 *        BREVO_API_KEY   from Brevo > SMTP & API > API keys
 *        BREVO_LIST_ID   the number of the list in Brevo > Contacts > Lists
 *        NOTIFY_EMAIL    who hears about contact form entries (info@nonfictionhotlist.com)
 *   2. Choose setup in the function menu and click Run. Approve the permissions. It makes the Sheet and
 *      checks the Brevo key and list.
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the web app URL.
 * To change this code later: paste the new version, then Deploy > Manage deployments > edit > New version,
 * so the URL stays the same.
 *
 * Kept in the website repo as drive-kit/forms.gs.
 */

const SHEET_NAME = "Website sign-ups";
const HEADER = ["Received", "Form", "First name", "Last name", "Email", "Newsletter", "Tell us about you", "How did you find us", "Brevo", "Page"];
const MIN_SECONDS = 3;          // a person takes longer than this to fill in a form

/** Makes the private Sheet and checks the Brevo settings. Run once from the editor. */
function setup() {
  const sheet = sheet_();
  Logger.log("Sign-ups Sheet: " + sheet.getParent().getUrl());
  const p = PropertiesService.getScriptProperties();
  ["BREVO_API_KEY", "BREVO_LIST_ID", "NOTIFY_EMAIL"].forEach(k => { if (!p.getProperty(k)) Logger.log("Missing script property " + k); });
  if (p.getProperty("BREVO_API_KEY")) {
    const res = brevo_("GET", "/contacts/lists/" + p.getProperty("BREVO_LIST_ID"));
    Logger.log(res.getResponseCode() === 200 ? "Brevo list found: " + JSON.parse(res.getContentText()).name
      : `Brevo said ${res.getResponseCode()}: ${res.getContentText().slice(0, 300)}`);
  }
}

// The website posts the form's fields as JSON (or as an ordinary form, if the visitor has no JavaScript).
function doPost(e) {
  let f = {};
  try { f = e.postData && /json|text\/plain/.test(e.postData.type) ? JSON.parse(e.postData.contents) : e.parameter; }
  catch (err) { f = e.parameter || {}; }
  const result = handle_(f);
  if (f._js) return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  // Without JavaScript the visitor lands here: a plain page that sends them back.
  const back = /^https:\/\/(new\.)?nonfictionhotlist\.com\//.test(f._page || "") ? f._page : "https://nonfictionhotlist.com/";
  return HtmlService.createHtmlOutput(`<p style="font:18px Georgia,serif;margin:40px">${result.ok ? "Thank you!" : result.error}</p>
    <p style="font:16px Georgia,serif;margin:0 40px"><a href="${back}" target="_top">Back to the Nonfiction Hotlist</a></p>`);
}

function handle_(f) {
  const s = v => String(v == null ? "" : v).trim().slice(0, 2000);
  // Spam: the hidden field is filled in, or the form came back too fast. Quietly says thanks and keeps nothing.
  if (s(f.website) || (Number(f._t) && Date.now() - Number(f._t) < MIN_SECONDS * 1000)) return { ok: true };
  const email = s(f.email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
  const form = s(f._form) === "newsletter" ? "newsletter" : "contact";
  const wants = form === "newsletter" || /^(on|yes|true|1)$/i.test(s(f.newsletter));
  // The same address can't send more than 5 times in 10 minutes.
  const cache = CacheService.getScriptCache(), key = "n:" + email, n = Number(cache.get(key) || 0);
  if (n >= 5) return { ok: false, error: "Thanks, we already have your message. Please try again later." };
  cache.put(key, String(n + 1), 600);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let brevo = "";
  try {
    if (wants) brevo = addToBrevo_(email, s(f.first), s(f.last));
    sheet_().appendRow([new Date(), form, s(f.first), s(f.last), email, wants ? "yes" : "no", s(f.about), s(f.found), brevo, s(f._page)]);
  } finally { lock.releaseLock(); }

  const to = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  if (form === "contact" && to) {
    MailApp.sendEmail({ to, replyTo: email, subject: `Website: ${[s(f.first), s(f.last)].join(" ").trim() || email} wrote in`,
      body: [`Name: ${s(f.first)} ${s(f.last)}`, `Email: ${email}`, `Newsletter: ${wants ? "yes" : "no"}${brevo ? " (" + brevo + ")" : ""}`,
        "", "Tell us about you:", s(f.about) || "-", "", "How did you find us:", s(f.found) || "-", "", `Sent from ${s(f._page)}`].join("\n") });
  }
  return { ok: true };
}

// Adds (or updates) the contact in the Brevo list. Returns what happened, for the Sheet.
function addToBrevo_(email, first, last) {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty("BREVO_API_KEY")) return "not sent: no Brevo key";
  const attributes = {};
  if (first) attributes.FIRSTNAME = first;
  if (last) attributes.LASTNAME = last;
  const res = brevo_("POST", "/contacts", { email, attributes, listIds: [Number(p.getProperty("BREVO_LIST_ID"))], updateEnabled: true });
  const code = res.getResponseCode();
  return code === 201 || code === 204 ? "added" : `failed (${code}): ${res.getContentText().slice(0, 200)}`;
}

function brevo_(method, path, body) {
  return UrlFetchApp.fetch("https://api.brevo.com/v3" + path, {
    method, contentType: "application/json", muteHttpExceptions: true,
    headers: { "api-key": PropertiesService.getScriptProperties().getProperty("BREVO_API_KEY"), accept: "application/json" },
    payload: body ? JSON.stringify(body) : undefined
  });
}

// The private Sheet, made on first use in matthew@'s My Drive and remembered after that.
function sheet_() {
  const p = PropertiesService.getScriptProperties();
  let ss = p.getProperty("SHEET_ID") ? SpreadsheetApp.openById(p.getProperty("SHEET_ID")) : null;
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    p.setProperty("SHEET_ID", ss.getId());
    const sh = ss.getSheets()[0].setName("Entries");
    sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return ss.getSheetByName("Entries");
}
