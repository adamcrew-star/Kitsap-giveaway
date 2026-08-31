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
  // Numeric Mailchimp tag id applied to every newsletter signup. Leave empty to
  // send no tag; Mailchimp's embedded endpoint only accepts tag ids, not names.
  signupTag: "",
};

const form = document.querySelector("#signup-form");
const entryStep = document.querySelector("#entry-step");
const successStep = document.querySelector("#success-step");
const submitButton = document.querySelector("#submit-button");
const submitLabel = submitButton.querySelector(".submit-label");
const statusEl = document.querySelector("#form-status");
const honeypot = document.querySelector("#hp-input");

const fields = {
  firstName: document.querySelector("#first-name"),
  lastName: document.querySelector("#last-name"),
  email: document.querySelector("#email"),
  phone: document.querySelector("#phone"),
};

const requiredText = [fields.firstName, fields.lastName, fields.email];

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "form-status" + (type ? " " + type : "");
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
        : "Please fill in your name and email.",
      "error"
    );
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
  const params = new URLSearchParams();
  params.set("EMAIL", fields.email.value.trim());
  params.set("FNAME", fields.firstName.value.trim());
  params.set("LNAME", fields.lastName.value.trim());
  params.set("PHONE", fields.phone.value.trim());
  if (MAILCHIMP.signupTag) params.set("tags", MAILCHIMP.signupTag);
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
  document.body.classList.add("entered");
  successStep.scrollIntoView({ behavior: "smooth", block: "nearest" });

  if (typeof window.gtag === "function") {
    window.gtag("event", "newsletter_signup_submitted", {
      campaign_name: "Kitsap Roof Pros Giveaways & Events",
    });
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("", null);

  if (!validate()) return;

  submitButton.disabled = true;
  submitLabel.textContent = "Signing up…";

  try {
    await submitToMailchimp();
    showSuccess();
  } catch (error) {
    setStatus("We couldn't reach the sign-up service. Please try again in a moment.", "error");
    submitButton.disabled = false;
    submitLabel.textContent = "Sign Up for Updates";
  }
});

requiredText.forEach((input) => {
  input.addEventListener("input", () => {
    if (input.classList.contains("invalid")) input.classList.remove("invalid");
  });
});
