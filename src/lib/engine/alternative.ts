/**
 * WHAT THEY DO INSTEAD, IN A SENTENCE THAT PARSES.
 *
 * Every problem in `knowledge/industries.ts` carries an `alternative` — the
 * thing the customer falls back on today. It is the most quoted field in the
 * generator: nineteen call sites across the plan, growth, research, execution
 * and explainer writers splice it into prose.
 *
 * And it comes in two grammatical shapes, roughly two thirds to one third:
 *
 *     "adapting things themselves"      an action  (gerund phrase)
 *     "a gift card"                     a thing    (noun phrase)
 *
 * Neither is wrong — a fallback genuinely is sometimes a behaviour and
 * sometimes an object — but a template can only be written for one of them,
 * and the writers were written for whichever shape the author had in front of
 * them. Measured across the catalogue, that produced real output reading
 * **"Today they panic-buying something worn once"**, **"Today they adapting
 * things themselves"**, and on the other side **"They currently a gift card"**.
 *
 * Normalising the data would be the wrong fix: rewriting sixty gerunds as
 * nouns would flatten "asking a neighbour and feeling guilty" into something
 * that no longer says what is bad about it, and the vividness of that phrase
 * is the whole reason the field exists.
 *
 * So the *frame* adapts instead. Pure functions over a string, so the suite
 * can throw every alternative in the catalogue at them without a browser.
 *
 * The frames that need no adaptation are left alone and are not wrapped in a
 * no-op helper: "the alternative is X", "instead of X" and "tired of X" are
 * already correct for both shapes.
 */

/**
 * Is the fallback written as an action rather than as a thing?
 *
 * A gerund phrase opens with a word ending in "-ing" — and the check is on the
 * *first* word only, deliberately. "a relative doing it badly" and "the car
 * sitting under a cover" both contain a gerund and are both plainly things;
 * matching anywhere in the string would classify half the nouns as actions.
 */
export function isAction(alternative: string): boolean {
  const first = alternative.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  // "nothing" is a thing that happens to end in -ing, and it appears as a
  // fallback ("living with it" is an action, "nothing" would not be).
  if (first === "nothing" || first === "something" || first === "everything") return false;
  return /ing$/.test(first);
}

/**
 * The predicate after a subject: "they …", "people who …", "most people I
 * speak to …".
 *
 * An action becomes a present continuous, which is what the field already
 * reads as. A thing gets a verb in front of it, because a noun cannot be a
 * predicate on its own.
 */
export function doingToday(alternative: string): string {
  return isAction(alternative) ? `are ${alternative}` : `fall back on ${alternative}`;
}
