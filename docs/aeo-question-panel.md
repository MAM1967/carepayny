# AEO question panel (monthly AI answer check)

An owner task, not code. Once a month, ask each question below in **ChatGPT, Google AI Mode, Perplexity and Microsoft Copilot**, 3 times each, in a fresh chat or a private window with no login history if possible. AI answers vary, so 3 runs per tool show what is typical.

For each run, record in a spreadsheet:

| Field | What to write |
| --- | --- |
| Date | Day of the check |
| Tool | ChatGPT, Google AI Mode, Perplexity or Copilot |
| Question # and language | For example 4-EN or 4-ES |
| Run | 1, 2 or 3 |
| CarePayNY cited? | Yes (linked), Yes (named, no link), or No |
| Which page | The CarePayNY address cited, if any |
| Numbers right? | Do the dollar amounts and dates match `src/data/rules.js` and `/rates/`? Note any wrong figure. |
| Other sources cited | The main other sites the answer used |

Three things to track over time: how often CarePayNY is cited, which pages get cited, and whether AI tools repeat wrong or outdated numbers (for example the older wage parity amounts of $4.09 and $3.22). A wrong number in an AI answer is a reason to check that the matching CarePayNY page states the right figure clearly in its first paragraph.

The questions are written the way caregivers search. Ask them exactly as written.

## English

1. What is the CDPAP pay rate in New York City in 2026?
2. How much does PPL pay CDPAP caregivers on Long Island?
3. What is the home care aide minimum wage in New York for 2027?
4. What is wage parity for home care workers in New York, and how much is it?
5. When does PPL pay CDPAP workers, and what is the timesheet deadline?
6. Why didn't PPL pay me this week?
7. What does "Pended" mean in PPL@Home?
8. Does CDPAP pay overtime in New York?
9. Do CDPAP caregivers get paid sick leave from PPL?
10. How are 24-hour shifts paid for home health aides in New York?
11. Can a family member get paid through CDPAP in New York?
12. What is the PPL settlement, and who gets money from it?
13. If a family hires me directly as a home care aide in New York, what is the minimum wage?
14. How do I sign up with PPL as a CDPAP personal assistant?
15. Where can a home care worker in New York file a wage claim?

## Español

1. ¿Cuánto paga CDPAP por hora en la Ciudad de Nueva York en 2026?
2. ¿Cuánto les paga PPL a los cuidadores de CDPAP en Long Island?
3. ¿Cuál es el salario mínimo para asistentes de cuidado en el hogar en Nueva York en 2027?
4. ¿Qué es la paridad salarial para los trabajadores de cuidado en el hogar en Nueva York y cuánto es?
5. ¿Cuándo paga PPL a los trabajadores de CDPAP y cuál es la fecha límite de la hoja de horas?
6. ¿Por qué PPL no me pagó esta semana?
7. ¿Qué significa "Pended" en PPL@Home?
8. ¿CDPAP paga horas extra en Nueva York?
9. ¿Los cuidadores de CDPAP tienen licencia por enfermedad pagada con PPL?
10. ¿Cómo se pagan los turnos de 24 horas a los asistentes de salud en el hogar en Nueva York?
11. ¿Un familiar puede recibir pago por CDPAP en Nueva York?
12. ¿Qué es el acuerdo con PPL y quién recibe dinero?
13. Si una familia me contrata directamente como asistente de cuidado en el hogar en Nueva York, ¿cuál es el salario mínimo?
14. ¿Cómo me inscribo con PPL como asistente personal de CDPAP?
15. ¿Dónde puede un trabajador de cuidado en el hogar en Nueva York presentar un reclamo de salarios?

## Notes

- Questions 1 to 4 and 13 should be answered by `/cdpap/pay-rate/` or `/rates/`. Questions 5 to 7 by `/cdpap/how-ppl-pays/` and `/cdpap/not-paid/`. Question 12 by `/cdpap/ppl-settlement/`. Question 15 by `/cdpap/help/`.
- Question 10 is answered today only by the calculator page (the 13-hour rule) and, for CDPAP live-in days, `/cdpap/pay-rate/`.
- Google's May 2026 guidance treats AI search as ordinary SEO, so the fix for a missed question is a clearer, sourced answer on the page, not special markup.
