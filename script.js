/*
 * Mailchimp configuration.
 *
 * These are the PUBLIC values from the "Joyce Construction Group" audience's
 * embedded signup form. They are safe to ship in client-side code. Never put a
 * Mailchimp API key here — a static page cannot keep it private.
 *
 *   host = the audience's list-manage host (from the embedded form <form action>)
 *   u    = account unique id  (the "u" param on the embedded form URL)
 *   id   = audience id        (the "id" param on the embedded form URL)
 */
const MAILCHIMP = {
  host: "kitsaproofpros.us14.list-manage.com",
  u: "1ca48ac180bdb25983e977ee1",
  id: "364af29c18",
  // Tag added to every entry; the branded welcome automation triggers on it.
  entryTag: "7138385",
};

const form = document.querySelector("#giveaway-form");
const entryStep = document.querySelector("#entry-step");
const successStep = document.querySelector("#success-step");
const submitButton = document.querySelector("#submit-button");
const submitLabel = submitButton.querySelector(".submit-label");
const statusEl = document.querySelector("#form-status");
const honeypot = document.querySelector("#hp-input");

const fields = {
  name: document.querySelector("#name"),
  email: document.querySelector("#email"),
  address: document.querySelector("#address"),
  phone: document.querySelector("#phone"),
  consent: document.querySelector("#consent"),
};

const requiredText = [fields.name, fields.email, fields.address, fields.phone];

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "form-status" + (type ? " " + type : "");
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  const first = parts.shift() || "";
  return { first, last: parts.join(" ") };
}

function validate() {
  let firstInvalid = null;

  requiredText.forEach((input) => {
    const empty = !input.value.trim();
    const badEmail = input === fields.email && input.value.trim() && !validEmail(input.value.trim());
    const invalid = empty || badEmail;
    input.classList.toggle("invalid", invalid);
    if (invalid && !firstInvalid) firstInvalid = input;
  });

  if (firstInvalid) {
    firstInvalid.focus();
    setStatus(
      firstInvalid === fields.email && fields.email.value.trim()
        ? "Please enter a valid email address."
        : "Please fill in all of your contact details.",
      "error"
    );
    return false;
  }

  if (!fields.consent.checked) {
    setStatus('Please check "YES! I want a free roof" to enter.', "error");
    return false;
  }

  return true;
}

/*
 * Submit to Mailchimp's classic embedded-form endpoint.
 *
 * This audience has JSONP (post-json) disabled, so we POST to /subscribe/post
 * with `mode: "no-cors"`. The request reaches Mailchimp and creates the
 * contact, but the response is opaque — we can't read success/error details,
 * so the caller treats a completed request as success (optimistic).
 */
function submitToMailchimp() {
  const { first, last } = splitName(fields.name.value);
  const checked = Array.from(document.querySelectorAll('input[name="interest"]:checked'));
  const interests = checked.map((box) => box.value).join(", ");
  const tags = [MAILCHIMP.entryTag]
    .concat(checked.map((box) => box.dataset.tag).filter(Boolean))
    .join(",");

  const params = new URLSearchParams();
  params.set("EMAIL", fields.email.value.trim());
  params.set("FNAME", first);
  params.set("LNAME", last);
  params.set("ADDR", fields.address.value.trim());
  params.set("PHONE", fields.phone.value.trim());
  params.set("INTEREST", interests);
  // Apply a Mailchimp tag per selected checkbox (comma-separated tag IDs).
  params.set("tags", tags);
  // Mailchimp bot-detection honeypot: named b_<u>_<id>, must stay empty.
  params.set("b_" + MAILCHIMP.u + "_" + MAILCHIMP.id, honeypot.value);

  const url =
    "https://" + MAILCHIMP.host + "/subscribe/post?u=" + MAILCHIMP.u + "&id=" + MAILCHIMP.id;

  return fetch(url, {
    method: "POST",
    mode: "no-cors",
    body: params,
  });
}

function showSuccess() {
  entryStep.hidden = true;
  successStep.hidden = false;
  successStep.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("", null);

  if (!validate()) return;

  submitButton.disabled = true;
  submitLabel.textContent = "Entering…";

  try {
    await submitToMailchimp();
    showSuccess();
  } catch (error) {
    setStatus("We couldn't reach the sign-up service. Please try again in a moment.", "error");
    submitButton.disabled = false;
    submitLabel.textContent = "Enter the giveaway";
  }
});

requiredText.forEach((input) => {
  input.addEventListener("input", () => {
    if (input.classList.contains("invalid")) input.classList.remove("invalid");
  });
});
