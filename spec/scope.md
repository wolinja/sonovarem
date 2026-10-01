# Scope

## 1. The problem and the users

Smallholder farmers across Ghana make planting, fertiliser and pest decisions with little expert support. Most digital farm advice arrives as English text, which shuts out farmers who cannot read or do not understand English.

In our survey of 13 smallholders in the Upper East Region (July 2026):
- 7 had received no farming information at all;
- none asked an extension officer about planting time;
- 12 said rainfall has become less reliable.

Sonovarem is a web app. A farmer asks a farming question by voice in her own language, starting with Asante Twi, and hears a grounded, cited answer spoken back. Literate farmers can use it too, by speaking or typing in English.

- **Primary users [O]:** farmers who cannot read or do not understand English.
- **Secondary users:** literate farmers, who use English voice or text.
- **Framing [O]:** the problem and the product are national. Berekuso (Eastern Region) is the **first test site**, not the target market.

**One ordinary day.** Maame Adwoa, in her fifties, farms two acres of maize with her family and cannot read. It is April and the first rains have come: some neighbours are planting and others are waiting. Last year she lost seed when the rain stopped. She taps the microphone and asks in Twi whether she should plant now. Sonovarem:
1. repeats her question back;
2. asks which town her farm is near;
3. tells her in Twi what the Ministry of Food and Agriculture maize guide says for her zone and what the week's forecast shows;
4. tells her to confirm fertiliser amounts with her agro-dealer, and names the guide it used.

## 2. Why the problem needs a learned component

| Approach | What it achieves | Where it stops |
|---|---|---|
| Rules: recorded voice menus, scheduled tips | Fixed messages in Twi; cheap and predictable | Cannot understand a free spoken question |
| Humans: extension officers, hotlines | The best judgement, in the farmer's language | Scarce: 0 of 13 surveyed farmers asked one about timing |
| Statistical: keyword search over guides | Finds passages in English documents | Needs typed English, so it excludes our primary user |

The gap is **language**, which needs learned components:
- turning free spoken Twi into a question a system can act on;
- turning an English source back into spoken Twi;
- finding the right passage for a loosely worded question.

**The advice itself is deliberately not learned.** Every claim comes from a cited extension document. Deterministic guards check doses, product names and numbers against those documents before anything is spoken.

## 3. The intelligent experience

**Ask → echo-back → clarify (at most one question per turn) → answer (Twi audio and text, key action first, source named aloud) → act and rate.**

The system advises; the farmer decides. Nothing is automated on her behalf.

When the system is unsure, it says so in words she can act on, never as a percentage or a confidence bar:
- it repeats back what it heard;
- it waits for her explicit yes whenever a number, dose or product name is involved;
- when its sources do not support an answer, it says "I don't know" and names who can help.

## 4. Success criteria

| Level | Criterion | Target | Source of the target |
|---|---|---|---|
| Organisation | Farmers who cannot read English get advice they use, across regions and languages; the core (language gateway, pipeline) is reusable | A working Twi proof of concept with field evidence by 2026-12-15 | Venture goal |
| Leading indicators | Returning users; share of answers rated positively | Baselines at the first rater round | No prior data |
| User outcome | **INS:** share of 60 Twi voice questions that are completed **and** correct (or an honest "I don't know") **and** understood **and** safe | ≥ 80% | Team threshold. If the four conditions failed independently, each would need about 95% (0.95⁴ ≈ 0.81) |
| Model | Twi ASR word error rate; TTS understood; retrieval recall@5 | ≤ 35%; ≥ 80%; ≥ 0.8 | Open Akan ASR scores 29–32% on general speech; 35% allows for farm vocabulary. The rest are team judgement |
| Safety (never traded) | Doses not quoted verbatim from a source (G-DOSE); unregistered products named (G-REG) | 0 of 30 audited items | A minimum bar, not proof: 0 failures in 30 still allows a true rate of up to about 9.5% (95% upper bound) |

How the levels connect: model metrics are necessary but not sufficient for INS, and only repeated use shows the organisational objective is met. Targets are reset once, in writing, at week 7.

## 5. When the system defers, degrades or declines

| Condition | Behaviour | Who absorbs the work |
|---|---|---|
| ASR confidence low, or the wrong language detected | Asks again with a pre-recorded Twi prompt; after two failures, offers a menu of common questions, typing, or another language | The farmer |
| The transcript contains a number, dose or product name, or confidence is middling | **Defers:** speaks the question back and waits for an explicit yes | The farmer (a few seconds) |
| A fact that changes the answer is missing (town, crop, crop stage) | Asks one clarifying question, at most two per question | The farmer |
| Sources do not support an answer | **Declines:** "I don't know", what it can answer, and who can help | Agro-dealers, extension officers |
| A dose is not quoted verbatim from a cited source, or a product is not on the EPA register | **Degrades** that sentence to "confirm the amount with your agro-dealer"; the product is not named | The agro-dealer |
| Out of policy: rainfall prediction, poisoning, prices | Declines with a fixed redirect; poisoning gets "seek medical help now" | Forecast services; clinics |
| Soil reading stale or simulated; translation lost a number | Answers without the reading and says so; shows English text and suggests a helper | The farmer's helper |
| A speech provider is down or too slow | Offers English voice, the menu, or text | The farmer; literate helpers |

**Choosing the confirmation threshold.** Skipping confirmation is justified only when the expected cost of acting on a wrong transcript is below the cost of one confirmation:

$$p_{\text{err}}(c)\,C_w < C_c \iff p_{\text{err}}(c) < C_c / C_w$$

- **Assumption [A]:** a wrong unconfirmed question costs at least 20 times as much as a confirmation. Implicit confirmation then needs p_err < 5%.
- **Numbers are always confirmed:** a wrong dose costs far more than a misheard question, so any transcript with a number, dose or product name always gets an explicit confirmation.
- **Next step:** p_err(c) will be estimated on our own Twi recordings in week 2, and we will publish the reliability curve with the chosen thresholds.

## 6. Who bears the cost when the system is wrong

**The cost.** The farmer bears it, in seed, fertiliser or a season's yield, though the decision to deploy is ours. There is no compensation route, so we keep answers conservative and cited.

**Her recourse:**
- every answer names its source aloud, so she can check it with an agro-dealer;
- she can say "that's wrong" or rate the answer, and the team reviews low ratings weekly;
- she can delete her data;
- under the Data Protection Act, 2012 (Act 843), she can complain to the Data Protection Commission.

## 7. Deliberately out of scope

- **Rainfall prediction:** we read out a third-party forecast; we could not validate our own model in 11 weeks.
- **Languages other than Asante Twi, and rollout beyond the Berekuso test site:** the language gateway is built for more languages (Ewe next), but we can only test Twi well this term.
- **Crop disease from photos, agronomist validation, a marketplace:** these need data or expertise we do not have.
- **USSD, WhatsApp, offline use:** the proof of concept assumes a smartphone and a browser.
- **Serving our own fine-tuned speech model to farmers:** it is a research result, deployed only if it clearly beats the chosen engine.
