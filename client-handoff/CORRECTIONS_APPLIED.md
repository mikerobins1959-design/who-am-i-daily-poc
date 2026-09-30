# Dataset corrections applied

`questions.json` is a corrected copy of the supplied `1-questions.json`. The
source file was not modified. This handoff applies only the 19 corrections Mike
approved: 13 exact answer-label changes and six malformed-choice repairs.

## Answer labels

| JSON record | Topic code | Previous `target_answer` | Corrected `target_answer` |
| ---: | --- | --- | --- |
| 209 | `SCI_0015` | Captain Jean-Luc Picard | Jean-Luc Picard |
| 376 | `ANC_0022` | Marcus Tullius Cicero | Cicero |
| 390 | `ANC_0036` | Seneca the Younger | Seneca |
| 393 | `ANC_0039` | Livia Drusilla | Livia |
| 443 | `SCI_0009` | Nikolaus Copernicus | Nicolaus Copernicus |
| 470 | `LEA_0016` | Atatürk (Mustafa Kemal) | Mustafa Kemal Atatürk |
| 489 | `LEA_0035` | Kaiser Wilhelm II | Wilhelm II |
| 493 | `LEA_0039` | Simon Bolivar | Simón Bolívar |
| 500 | `MIL_0006` | Duke of Wellington (Arthur Wellesley) | Duke of Wellington |
| 513 | `MIL_0019` | Tamerlane (Timur) | Tamerlane |
| 518 | `MIL_0024` | Saladin (Salah ad-Din) | Saladin |
| 525 | `MIL_0031` | Admiral Yi Sun-sin | Yi Sun-sin |
| 528 | `MIL_0034` | John Churchill (Duke of Marlborough) | Duke of Marlborough |

## Malformed choices

Field positions are one-based, matching the client correction report.

| JSON record | Topic code | Field | Previous value | Corrected value |
| ---: | --- | --- | --- | --- |
| 489 | `LEA_0035` | `alt_answers[1]` | King George VTsar Nicholas II | King George V |
| 489 | `LEA_0035` | `alt_answers[4]` | blank | Tsar Nicholas II |
| 491 | `LEA_0037` | `alt_answers[3]` | Frederick the GreatTsar Paul I | Frederick the Great |
| 491 | `LEA_0037` | `alt_answers[4]` | blank | Tsar Paul I |
| 492 | `LEA_0038` | `options[2]` | Catherine the GreatTsar Nicholas II | Catherine the Great |
| 492 | `LEA_0038` | `alt_answers[4]` | blank | Tsar Nicholas II |
| 499 | `MIL_0005` | `options[4]` | Marshal NeyTsar Alexander I | Marshal Ney |
| 499 | `MIL_0005` | `alt_answers[4]` | blank | Tsar Alexander I |
| 514 | `MIL_0020` | `options[2]` | Napoleon BonaparteTsar Alexander I | Napoleon Bonaparte |
| 514 | `MIL_0020` | `alt_answers[4]` | blank | Tsar Alexander I |
| 524 | `MIL_0030` | `alt_answers[1]` | Johan BanérTurenne | Johan Banér |
| 524 | `MIL_0030` | `alt_answers[4]` | blank | Turenne |

## Validation

- Records: 534
- Records with three non-empty clues: 534
- Records with eight non-empty, distinct combined choices: 534
- Records whose `target_answer` exactly matches a combined choice: 534
- Changed scalar fields: 25 across 18 unique records
- Source SHA-256: `cecfceeeb5af1a91ceb24b6c15a034794f1ba84aff60c18866f8e3b8f177443d`
- Corrected SHA-256: `99c7b747ef88ec9a37876f9ebb0b2293b7f202ad1e341da4d10438fc2dfb47eb`

The parsed source and corrected copy were compared recursively. The only
differences were the 13 answer fields and 12 choice fields listed above.
Scheduling, dates, category mixing, duplicate identities, topic codes, clues,
difficulty, and all other content remain unchanged.

`npm run import:puzzles` converts this corrected source into the runtime file.
It removes only byte-for-byte equivalent gameplay content, mixes categories
deterministically, spaces repeated answer labels where possible, and assigns
consecutive dates beginning `2026-10-20`.

The current schedule is safe to regenerate while it is still unpublished. Once
any dated puzzle has gone live, do not rerun the mixer over a revised or expanded
source because that would move already published questions to different dates.
Preserve the existing dated entries and append newly approved puzzles instead.

“JSON record” is the one-based position in the array. A spreadsheet row is
`JSON record + 1` only when the sheet has exactly one header row and retains the
same record order.
