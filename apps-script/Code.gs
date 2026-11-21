/**
 * Lynn & Fadi — RSVP backend.
 * Lives inside a Google Sheet (Extensions → Apps Script). See README.md.
 *
 * Tabs it creates:
 *   RSVP     one row per household (re-sending with the same email updates the row)
 *   Summary  headcount, children, declines, allergy & diet counts
 *   Kitchen  only the rows with allergies / diets / notes
 *   Music    every song suggestion
 */

// Optional: get an email for every reply. Leave "" to switch off.
const NOTIFY_EMAIL = "";

const HEADERS = [
  "Submitted", "Updated", "Attending", "Name", "Email", "Phone",
  "Companions", "Companion names", "Children", "Total people",
  "Allergies", "Allergies (other)", "Diet", "Diet (other)", "Kitchen notes",
  "Music", "Message", "Language", "Country"
];
const COL = Object.fromEntries(HEADERS.map((h, i) => [h, i + 1]));
const L = n => String.fromCharCode(64 + n); // column letter (A–S)

const ALLERGIES = ["Gluten (coeliac)", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soy", "Milk (protein allergy)",
  "Lactose (intolerance)", "Tree nuts (walnuts, almonds…)", "Celery", "Mustard", "Sesame", "Sulphites", "Lupin",
  "Molluscs", "Fructose", "Histamine", "Nightshades (tomato, peppers…)", "Corn"];
const DIETS = ["Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher", "No pork", "No beef", "No alcohol",
  "Gluten-free (by choice)", "Lactose-free (by choice)", "Diabetic / low sugar", "Low salt",
  "Pregnant (nothing raw etc.)", "No onion or garlic", "Low-carb / keto", "Kids' menu"];

/** Run once by hand (▶ Run → setup) to build the tabs. Safe to run again. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const rsvp = ss.getSheetByName("RSVP") || ss.insertSheet("RSVP", 0);
  rsvp.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight("bold").setBackground("#5d7a62").setFontColor("#ffffff");
  rsvp.setFrozenRows(1); rsvp.setFrozenColumns(4);
  rsvp.getRange("A:B").setNumberFormat("dd.mm.yyyy hh:mm");
  rsvp.getRange(`${L(COL["Music"])}:${L(COL["Message"])}`).setWrap(true);
  rsvp.setColumnWidths(1, HEADERS.length, 140);
  rsvp.setColumnWidth(COL["Name"], 180);
  rsvp.setColumnWidth(COL["Music"], 240);
  rsvp.setColumnWidth(COL["Message"], 260);
  const att = rsvp.getRange(`${L(COL["Attending"])}2:${L(COL["Attending"])}`);
  rsvp.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Yes").setBackground("#dfeadf").setRanges([att]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("No").setBackground("#f1e3e0").setRanges([att]).build()
  ]);

  // Summary
  const sum = ss.getSheetByName("Summary") || ss.insertSheet("Summary", 1);
  sum.clear();
  const r = c => `RSVP!${L(COL[c])}2:${L(COL[c])}`;
  const rows = [
    ["Lynn & Fadi — 27.03.2027", ""],
    ["Deadline for the venue", "15.01.2027"],
    ["", ""],
    ["TOTAL PEOPLE COMING", `=SUM(${r("Total people")})`],
    ["…of which children (<12)", `=SUMIF(${r("Attending")},"Yes",${r("Children")})`],
    ["…adults", "=B4-B5"],
    ["Households coming", `=COUNTIF(${r("Attending")},"Yes")`],
    ["Households not coming", `=COUNTIF(${r("Attending")},"No")`],
    ["Replies received", `=COUNTA(${r("Name")})`],
    ["", ""],
    ["ALLERGIES (households mentioning)", ""],
    ...ALLERGIES.map(a => [a, `=COUNTIF(${r("Allergies")},"*${a.replace(/[*?~]/g, "~$&")}*")`]),
    ["Other (see Kitchen tab)", `=COUNTIF(${r("Allergies (other)")},"?*")`],
    ["", ""],
    ["DIET (households mentioning)", ""],
    ...DIETS.map(d => [d, `=COUNTIF(${r("Diet")},"*${d.replace(/[*?~]/g, "~$&")}*")`]),
    ["Other (see Kitchen tab)", `=COUNTIF(${r("Diet (other)")},"?*")`]
  ];
  sum.getRange(1, 1, rows.length, 2).setValues(rows);
  sum.getRange("A1").setFontSize(16).setFontWeight("bold");
  sum.getRange("A4:B4").setFontSize(14).setFontWeight("bold").setBackground("#dfeadf");
  [11, 11 + ALLERGIES.length + 3].forEach(row => sum.getRange(row, 1).setFontWeight("bold"));
  sum.setColumnWidth(1, 300); sum.setColumnWidth(2, 110);

  // Kitchen
  const k = ss.getSheetByName("Kitchen") || ss.insertSheet("Kitchen", 2);
  k.clear();
  const kCols = ["Name", "Total people", "Companion names", "Allergies", "Allergies (other)", "Diet", "Diet (other)", "Kitchen notes"];
  k.getRange(1, 1, 1, kCols.length).setValues([kCols]).setFontWeight("bold").setBackground("#5d7a62").setFontColor("#fff");
  const cond = `(${r("Attending")}="Yes")*((${r("Allergies")}<>"")+(${r("Allergies (other)")}<>"")+(${r("Diet")}<>"")+(${r("Diet (other)")}<>"")+(${r("Kitchen notes")}<>"")>0)`;
  kCols.forEach((c, i) => k.getRange(2, i + 1).setFormula(`=IFERROR(FILTER(${r(c)},${cond}),"")`));
  k.setFrozenRows(1); k.setColumnWidths(1, kCols.length, 190);

  // Music
  const m = ss.getSheetByName("Music") || ss.insertSheet("Music", 3);
  m.clear();
  m.getRange("A1:B1").setValues([["From", "Songs"]]).setFontWeight("bold").setBackground("#5d7a62").setFontColor("#fff");
  m.getRange("A2").setFormula(`=IFERROR(FILTER(${r("Name")},${r("Music")}<>""),"")`);
  m.getRange("B2").setFormula(`=IFERROR(FILTER(${r("Music")},${r("Music")}<>""),"")`);
  m.setColumnWidth(1, 200); m.setColumnWidth(2, 420); m.getRange("B:B").setWrap(true);

  const def = ss.getSheetByName("Sheet1") || ss.getSheetByName("Feuille 1") || ss.getSheetByName("Tabellenblatt1") || ss.getSheetByName("Blad1");
  if (def && ss.getSheets().length > 4 && def.getLastRow() === 0) ss.deleteSheet(def);
}

function doGet() {
  return json({ ok: true, hello: "Lynn & Fadi RSVP" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.website) return json({ ok: true }); // honeypot
    const clip = (v, n) => String(v == null ? "" : v).slice(0, n || 500);
    const email = clip(d.email, 160).trim().toLowerCase();
    if (!email || !d.name) return json({ ok: false, error: "missing" });

    const sh = SpreadsheetApp.getActive().getSheetByName("RSVP");
    if (!sh) throw new Error("Run setup() first");
    const now = new Date();
    const row = [
      now, "", d.attending === "Yes" ? "Yes" : "No", clip(d.name, 120), email, "'" + clip(d.phone, 40),
      Number(d.companions) || 0, clip(d.companionNames, 1500), Number(d.children) || 0, Number(d.total) || 0,
      clip(d.allergies), clip(d.allergiesOther, 200), clip(d.diet), clip(d.dietOther, 200), clip(d.kitchen, 300),
      clip(d.music, 1500), clip(d.message, 1000), clip(d.lang, 5), clip(d.country, 5)
    ];

    // same email → update the existing row instead of adding a duplicate
    const last = sh.getLastRow();
    let target = 0;
    if (last > 1) {
      const emails = sh.getRange(2, COL["Email"], last - 1, 1).getValues();
      const i = emails.findIndex(x => String(x[0]).toLowerCase() === email);
      if (i >= 0) target = i + 2;
    }
    if (target) {
      row[0] = sh.getRange(target, 1).getValue();
      row[1] = now;
      sh.getRange(target, 1, 1, row.length).setValues([row]);
    } else {
      sh.appendRow(row);
    }

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL,
        `RSVP ${row[2] === "Yes" ? "✔" : "✘"} ${row[3]} (${row[9]} pers.)${target ? " — updated" : ""}`,
        HEADERS.map((h, i) => `${h}: ${row[i]}`).join("\n"));
    }
    return json({ ok: true, updated: !!target });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
