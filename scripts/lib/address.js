// Where the website is served right now. The preview address until the switch from Squarespace;
// then change this to "https://nonfictionhotlist.com" (and the list site picks it up with the menu).
// FORMS is the web app URL of drive-kit/forms.gs (the contact and newsletter forms send there). Empty
// means the forms show as not connected yet.
module.exports = {
  PUBLIC: "https://new.nonfictionhotlist.com",
  FORMS: process.env.FORMS_URL || "https://script.google.com/macros/s/AKfycbyxYfOaNFMmdlyL2j0FwPGMlDve4YAYJhnXJPc6-BLJH5ohr07osbdQrtGdoBMx7PXO/exec"
};
