// Runs drive-kit/forms.gs against stand-ins for Google (Sheets, mail, cache) and Brevo, and checks every rule.
//   node drive-kit/test/forms-test.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let now = Date.parse("2026-11-04T12:00:00Z");
const rows = [], mails = [], brevoCalls = [], cache = {};
const props = { BREVO_API_KEY: "key", BREVO_LIST_ID: "7", NOTIFY_EMAIL: "info@nonfictionhotlist.com" };
const sheet = { appendRow: r => rows.push(r), getRange: () => ({ setValues: () => ({ setFontWeight: () => {} }) }), setFrozenRows: () => {}, getLastColumn: () => 10 };
const box = {
  Logger: { log: () => {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
  SpreadsheetApp: { create: () => ({ getId: () => "sheet1", getSheets: () => [{ setName: () => sheet }], getSheetByName: () => sheet }),
    openById: () => ({ getSheetByName: () => sheet }) },
  MailApp: { sendEmail: m => mails.push(m) },
  CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
  LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
  UrlFetchApp: { fetch: (url, o) => { brevoCalls.push({ url, body: JSON.parse(o.payload || "{}"), key: o.headers["api-key"] }); return { getResponseCode: () => 201, getContentText: () => "{}" }; } },
  ContentService: { createTextOutput: t => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: "json" } },
  HtmlService: { createHtmlOutput: h => ({ html: h }) },
  Date: Object.assign(function (...a) { return a.length ? new Date(...a) : new Date(now); }, { now: () => now })
};
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "forms.gs"), "utf8"), box);

const send = f => box.doPost({ postData: { type: "text/plain", contents: JSON.stringify({ _js: 1, _t: now - 10000, _page: "https://new.nonfictionhotlist.com/", ...f }) } });
let failed = 0;
const expect = (what, cond) => { if (!cond) failed++; console.log(`${cond ? "ok  " : "FAIL"} ${what}`); };
const counts = () => [rows.length, mails.length, brevoCalls.length].join("/");

let r = send({ _form: "contact", email: "a@x.org", website: "http://spam" });
expect("spam trap: thanks, nothing kept", r.ok && counts() === "0/0/0");
r = send({ _form: "contact", email: "a@x.org", _t: now - 1000 });
expect("sent within 3 seconds: thanks, nothing kept", r.ok && counts() === "0/0/0");
r = send({ _form: "contact", email: "not-an-email" });
expect("bad email: refused with a reason", !r.ok && /valid email/.test(r.error) && counts() === "0/0/0");
r = send({ _form: "contact", first: "Ada", last: "Lovelace", email: "Ada@X.org", about: "Producer", found: "A friend" });
expect("contact without the tick: Sheet and email, not Brevo", r.ok && counts() === "1/1/0" && rows[0][4] === "ada@x.org" && rows[0][5] === "no");
expect("the email says who wrote and replies to them", /Ada Lovelace/.test(mails[0].subject) && mails[0].replyTo === "ada@x.org" && /Producer/.test(mails[0].body));
r = send({ _form: "contact", first: "Bo", last: "Diddley", email: "bo@x.org", newsletter: "yes" });
expect("contact with the tick: Sheet, email and Brevo", r.ok && counts() === "2/2/1" && rows[1][8] === "added");
expect("Brevo gets the list, the names and the key", brevoCalls[0].body.listIds[0] === 7 && brevoCalls[0].body.attributes.FIRSTNAME === "Bo" && brevoCalls[0].key === "key" && brevoCalls[0].url.endsWith("/contacts"));
r = send({ _form: "newsletter", email: "cy@x.org" });
expect("newsletter box: Sheet and Brevo, no email", r.ok && counts() === "3/2/2");
for (let i = 0; i < 6; i++) r = send({ _form: "newsletter", email: "dee@x.org" });
expect("sixth send from one address in 10 minutes: refused", !r.ok && /try again later/.test(r.error));
r = send({ _form: "newsletter", first: "Fay", email: "fay@x.org", role: "Brand or funder" });
expect("homepage sign-up: I'm a saved in the Sheet", r.ok && rows[rows.length - 1][10] === "Brand or funder");
expect("I'm a not sent to Brevo without BREVO_ROLE_ATTRIBUTE", !("ROLE" in brevoCalls[brevoCalls.length - 1].body.attributes));
props.BREVO_ROLE_ATTRIBUTE = "ROLE";
r = send({ _form: "newsletter", email: "gus@x.org", role: "Fan of nonfiction" });
expect("I'm a sent to Brevo when the attribute is set", brevoCalls[brevoCalls.length - 1].body.attributes.ROLE === "Fan of nonfiction");
r = send({ _form: "newsletter", email: "hal@x.org", role: "<script>" });
expect("an I'm a that isn't one of the four choices is saved blank", rows[rows.length - 1][10] === "" && !("ROLE" in brevoCalls[brevoCalls.length - 1].body.attributes));
const page = box.doPost({ parameter: { _form: "newsletter", email: "eve@x.org", _t: String(now - 10000), _page: "https://new.nonfictionhotlist.com/news/" } });
expect("without JavaScript: a thank-you page linking back", /Thank you!/.test(page.html) && /new\.nonfictionhotlist\.com\/news\//.test(page.html));
console.log(failed ? `${failed} failed` : "all forms rules hold");
process.exit(failed ? 1 : 0);
