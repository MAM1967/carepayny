# AI translation prompts

Copy a prompt, fill in the parts in `<angle brackets>`, and paste the inputs below it. Use a strong model.
Each page is translated as a whole file, including its front matter (the part between the `---` lines).
The glossary for a language is `glossary.md` (English terms and meanings) plus `glossary.<lang>.md` (the approved translations).

There are two kinds of text:
- **Guide pages:** `src/content/en/cdpap/**/*.md` and `src/content/en/pay/**/*.md` → `src/content/<lang>/cdpap/` and `src/content/<lang>/pay/` with the same file names.
- **Site text** (calculator, menus, footer): `src/i18n/ui/en.json` → `src/i18n/ui/<lang>.json`. Translate the values only. Keep every key, every `{placeholder}`, and every HTML tag and `href` exactly. Skip keys that start with `_`.

A language goes live only when all its guide pages and all its site text are done (the build checks this). `npm test` checks tokens, links, placeholders and tags.

## 1. First translation

```
You are translating one page of CarePayNY, a free website about pay for home care workers in New York State.

Audience: home care workers in New York who speak <LANGUAGE> and have limited or no English. Many read on a phone.

Translate the English page below into <LANGUAGE>.

Rules:
1. Reading level: about 6th grade. Short sentences. Common, everyday words. Active voice.
2. Use the glossary terms exactly. Never translate the "Never translate" terms.
3. Keep the meaning exact. Do not add advice, warnings or information that is not in the English.
4. Describe, don't direct: if the English describes an option, do not turn it into an instruction.
5. Keep exactly as they are: every {{token}} (for example {{ppl.nyc}}), every link URL, every Markdown mark (#, |, -, **, []()), and every phone number, email and date. (The site adds the language folder, like /es/, to links between our own pages (/, /cdpap/… and /pay/…) by itself.)
6. In the front matter, translate only the values of title, description and nav, and the label of each source. Keep every key, url, order and lastChecked as is.
7. Output only the translated file. No notes before or after.

GLOSSARY:
<paste docs/translation/glossary.md>

ENGLISH PAGE:
<paste the English Markdown file>
```

## 2. Update after the English changes

```
You are updating an existing <LANGUAGE> translation of a CarePayNY page. The English page changed.

Change only the parts of the <LANGUAGE> page that match what changed in English. Keep every other sentence word for word. Follow the same rules as the first translation (6th-grade level, glossary terms exactly, keep tokens, links, Markdown, phone numbers, emails and dates as they are, no added content).

Output only the full updated <LANGUAGE> file.

GLOSSARY:
<paste glossary>

OLD ENGLISH:
<paste>

NEW ENGLISH:
<paste>

CURRENT <LANGUAGE> TRANSLATION:
<paste>
```

## 3. Back-translation check

Run this in a **new chat**, without the English original, so the check is independent.

```
Translate this <LANGUAGE> text into plain English, as literally as you can. Do not fix, improve or explain it. Keep {{tokens}} and links as they are.

<paste the translated page or the changed part>
```

Then compare the result with the English page. Fix the translation where the **meaning** differs: numbers, who does what, deadlines, yes/no, what is allowed or not allowed. Small wording differences are fine.
