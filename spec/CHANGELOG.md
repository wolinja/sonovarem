# Specification changelog

Later milestones amend the specification in place. Each entry records what changed and why.

## M1 amendment — 2026-10-02: response to adversarial pass 1

Group 3 reviewed our architecture sketch and measurement stub. We accept two findings, and a third was already covered by the build specification but not shown here.

| Finding (their severity) | Verdict | Change to this specification |
|---|---|---|
| Denial of wallet through the speculative lane: reject every echo-back so paid MT and LLM calls are thrown away (High) | Accepted; partly covered by turn limits, sign-in, the menu after a second "no", cancellation and provider spend caps | After a "no", no speculation for that user's next question until it is confirmed; per-user daily cost cap; new signal on discarded speculative spend per user ([architecture.md](architecture.md) §3, [measurement.md](measurement.md) §2, [decisions.md](decisions.md)) |
| Replay of signed soil-sensor payloads (Medium) | Already covered in the build specification (timestamp window, nonce, de-duplication), not stated here | TB5 now states the replay controls; replay rejects added as a signal ([architecture.md](architecture.md) §1, [measurement.md](measurement.md) §2) |
| Semantic evasion through the English pivot (Medium) | Accepted; partly covered by masking, pre-recorded safety sentences and placeholder checks | Runtime back-translation of dose, product and warning sentences, with fallback to the pre-recorded template; new failure-mode row and signal ([architecture.md](architecture.md) §2–3, [measurement.md](measurement.md) §2–3) |

All thresholds and the per-user cost limit are provisional and are set from the week-2 measurements.

## M1 — 2026-10-01

First version: scope, architecture, measurement plan and decisions.

**Framing:**
- the target is smallholder farmers across Ghana, starting with Twi;
- Berekuso is the first test site;
- primary users cannot read or do not understand English.

**Changes from the team's first idea:**
- from an IoT project to a language-first advisor;
- from no English voice to three modes (Twi voice, English voice, English text);
- from an agent that chooses its tools to a fixed pipeline;
- a reusable language gateway;
- hosting on a Hetzner VPS behind Traefik and Cloudflare.
