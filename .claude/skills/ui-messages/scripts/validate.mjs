#!/usr/bin/env node
// ui-messages validator. No dependencies. Node 18+.
//
// Usage:
//   node validate.mjs messages.json
//   node validate.mjs --type error --component toast --title "Asset not saved" \
//     --body "Check your connection and try again." --action "Retry" --persistent
//
// JSON: one object or an array of objects:
//   { "type": "warning", "component": "alert", "title": "...", "body": "...",
//     "action": "...", "persistent": false }
//
// type:      neutral | info | success | warning | error | confirm
// component: field | toast | alert | dialog | empty
// persistent (toast only): true when the toast stays until dismissed.
//
// Exit code 1 when any ERROR is found. Checks limits and wording only;
// it cannot judge meaning, so still read the message against SKILL.md.

import { readFileSync } from "node:fs";

const TYPES = ["neutral", "info", "success", "warning", "error", "confirm"];
const COMPONENTS = ["field", "toast", "alert", "dialog", "empty"];
const ARTICLES = new Set(["a", "an", "the"]);

const GENERIC_TITLES =
	/^(error|warning|success|info|information|notice|alert|heads up|oops|attention|note|important|failed|failure)$/i;
const IMPERATIVE_START =
	/^(add|create|set|click|tap|enter|select|choose|check|try|please|go|open|use|make|fill|update|remove|delete)\b/i;
const BANNED_ERROR = [
	[/\bplease\b/i, '"please" makes a required step sound optional'],
	[/\bsorry\b/i, '"sorry" makes the problem feel worse'],
	[/\boops\b/i, '"oops" is vague and flippant'],
	[/\bsuccessfully\b/i, '"successfully" adds nothing; use object + past verb'],
	[/!/, "no exclamation marks"]
];
const BANNED_WARN = [
	[/\bunfortunately\b/i, '"unfortunately" is filler'],
	[/\byou can\b/i, 'drop "you can"; start with the verb'],
	[/\b(click|tap)\b/i, "name the action or put a button in the message instead of 'click/tap'"],
	[
		/\b(above|below|on the (left|right)|at the (top|bottom)|top[- ]right|sidebar)\b/i,
		"don't point to screen locations; put the button in the message"
	],
	[
		/\b(error code|exception|null|undefined|http|status code|stack trace|payload|endpoint|sql|constraint|[45]\d\d)\b/i,
		"technical term or code; use plain words and log the details"
	],
	[/\byou (failed|forgot|didn'?t|did not|made)\b/i, "sounds like blame; state the fix neutrally"]
];
const VAGUE_ACTION_ERROR = /^(ok|okay|done|yes|no|click here|here)$/i;
const VAGUE_ACTION_WARN = /^(continue|submit|proceed|confirm|go|next)$/i;

// ---------- helpers ----------

const words = (s) => s.trim().split(/\s+/).filter(Boolean);
const contentWords = (s) =>
	words(s.replace(/[^\p{L}\p{N}\s'-]/gu, " ")).filter((w) => !ARTICLES.has(w.toLowerCase()));

function sentences(s) {
	const cleaned = s.replace(/\b(e\.g|i\.e|etc|vs)\./gi, "$1");
	return cleaned
		.split(/[.!?]+(?:\s+|$)/)
		.map((x) => x.trim())
		.filter(Boolean);
}

function looksTitleCase(title) {
	const w = words(title).slice(1);
	const caps = w.filter(
		(x) => x.length > 3 && /^[A-Z][a-z]/.test(x) // Capitalized, not an acronym
	);
	return caps.length >= 2;
}

function overlapRatio(title, body) {
	const t = contentWords(title.toLowerCase()).filter((w) => w.length > 2);
	if (t.length === 0) return 0;
	const b = new Set(contentWords((sentences(body)[0] ?? "").toLowerCase()));
	return t.filter((w) => b.has(w)).length / t.length;
}

// ---------- checks ----------

function check(msg) {
	const errors = [];
	const warns = [];
	const E = (m) => errors.push(m);
	const W = (m) => warns.push(m);

	const type = (msg.type ?? "").toLowerCase();
	const component = (msg.component ?? "").toLowerCase();
	const title = (msg.title ?? "").trim();
	const body = (msg.body ?? "").trim();
	const action = (msg.action ?? "").trim();

	if (!TYPES.includes(type)) E(`type must be one of: ${TYPES.join(", ")}`);
	if (!COMPONENTS.includes(component)) E(`component must be one of: ${COMPONENTS.join(", ")}`);

	// ----- title -----
	if (component === "field") {
		if (title) E("field errors have no title; put one sentence in body");
	} else if (["toast", "dialog", "empty"].includes(component) && !title) {
		E(`${component} needs a title`);
	} else if (component === "alert" && !title && ["warning", "error"].includes(type)) {
		E(`${type} alerts need a title (the condition or what failed)`);
	}

	if (title) {
		const n = contentWords(title).length;
		if (n > 5) E(`title has ${n} words (max 5, target 2-4, not counting a/an/the)`);
		else if (n === 5) W("title has 5 words; aim for 2-4");

		if (/\.$/.test(title)) E("title ends with a period");
		if (/!/.test(title)) E("title has an exclamation mark");
		if (GENERIC_TITLES.test(title.replace(/[^\p{L}\s]/gu, "").trim()))
			E(`generic title "${title}"; say what happened`);
		else if (/^(error|warning|success|info|notice|alert)\b/i.test(title))
			E("don't label the type in the title (the icon and color do that); say what happened");
		if (/^are you sure\b/i.test(title))
			E('"Are you sure?" is vague; use verb + object + "?" (e.g. "Delete asset?")');
		if (/\bsuccess(fully)?\b/i.test(title)) E('title uses "success"; use object + past verb');

		if (type === "confirm" && !/\?$/.test(title))
			W('confirm title should be a question: verb + object + "?"');
		if (!["confirm", "empty"].includes(type) && component !== "empty" && /\?$/.test(title))
			W("question titles are for confirm dialogs and empty states");

		if (!["confirm"].includes(type) && component !== "empty" && IMPERATIVE_START.test(title))
			W("title reads like an instruction; state the condition, put the action in body/button");

		if (looksTitleCase(title)) W("looks like Title Case; use sentence case (ignore if these are proper nouns)");
	}

	// ----- body -----
	if (component === "field" && !body) E("field error needs body text with the fix");

	if (body) {
		const n = sentences(body).length;
		const max = component === "field" ? 1 : 2;
		if (n > max) E(`body has ${n} sentences (max ${max})`);
		if (body.length > 160) W(`body is ${body.length} characters; aim for under 160`);
		if (title && overlapRatio(title, body) >= 0.7) W("body's first sentence repeats the title");
	}

	const fields = { title, body, action };
	for (const [name, text] of Object.entries(fields)) {
		if (!text) continue;
		for (const [re, why] of BANNED_ERROR) {
			if (name === "title" && re.source === "!") continue; // checked above
			if (re.test(text)) E(`${name}: ${why}`);
		}
		for (const [re, why] of BANNED_WARN) {
			if (name === "action") continue;
			if (re.test(text)) W(`${name}: ${why}`);
		}
	}

	if (type === "error" && component !== "field" && !body && !action)
		W("errors must give a fix: add a body sentence or an action button (skip only when the fix is shown elsewhere, e.g. field errors under a form summary)");

	// ----- action -----
	if (action) {
		const n = words(action).length;
		if (n > 3) E(`action label has ${n} words (max 3, verb first)`);
		if (/[.!?]$/.test(action)) E("action label ends with punctuation");
		if (VAGUE_ACTION_ERROR.test(action)) E(`vague action "${action}"; use a specific verb`);
		else if (VAGUE_ACTION_WARN.test(action)) W(`"${action}" is vague; name what happens`);

		if (component === "field") W("field errors usually need no button");

		if (type === "confirm" && title) {
			const verb = words(action)[0].toLowerCase();
			if (!title.toLowerCase().includes(verb))
				W(`confirm button "${action}" should reuse the title's verb`);
		}

		if (component === "toast" && !msg.persistent && !/^undo$/i.test(action))
			W("toast has an action but may auto-dismiss; set duration: Number.POSITIVE_INFINITY (persistent: true) or make the action reachable elsewhere");
	} else if (type === "confirm") {
		E("confirm dialogs need a specific action button (e.g. Delete)");
	}

	return { errors, warns };
}

// ---------- input ----------

function parseArgs(argv) {
	const msg = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("--")) continue;
		const key = a.slice(2);
		if (key === "persistent") {
			msg.persistent = true;
			continue;
		}
		msg[key] = argv[i + 1] ?? "";
		i++;
	}
	return msg;
}

function load() {
	const argv = process.argv.slice(2);
	if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
		console.log(
			'Usage:\n  node validate.mjs messages.json\n  node validate.mjs --type warning --component alert --title "..." --body "..." --action "..." [--persistent]'
		);
		process.exit(0);
	}
	if (!argv[0].startsWith("--")) {
		const data = JSON.parse(readFileSync(argv[0], "utf8"));
		return Array.isArray(data) ? data : [data];
	}
	return [parseArgs(argv)];
}

// ---------- run ----------

const messages = load();
let totalErrors = 0;
let totalWarns = 0;

messages.forEach((msg, i) => {
	const { errors, warns } = check(msg);
	totalErrors += errors.length;
	totalWarns += warns.length;
	const label = msg.title || msg.body || "(empty)";
	console.log(`[${i + 1}] ${msg.type ?? "?"} / ${msg.component ?? "?"} / "${label}"`);
	if (!errors.length && !warns.length) console.log("  OK");
	errors.forEach((e) => console.log(`  ERROR  ${e}`));
	warns.forEach((w) => console.log(`  WARN   ${w}`));
});

console.log(`\n${messages.length} message(s), ${totalErrors} error(s), ${totalWarns} warning(s)`);
process.exit(totalErrors ? 1 : 0);
