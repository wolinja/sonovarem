# Measurement and monitoring

**No results yet.** This file states what we will measure, where in the [architecture](architecture.md) each signal is recorded, and what would tell us the system has degraded. The triggers are provisional: they will be reset once, in writing, when the first measurements exist (week 7).

## 1. What we will measure before release

| Metric | Why it matters for us | Target |
|---|---|---|
| **INS** on 60 Twi voice questions | What a farmer experiences: completed, correct, understood and safe | ≥ 80% |
| Twi ASR word error rate on our own farm-question recordings | A misheard question is the most likely failure | ≤ 35% |
| Numbers heard or translated wrongly | A wrong number changes the advice | reported |
| G-DOSE / G-REG violations on a 30-item suite | The failure that could hurt a farmer | 0 |
| Time to first answer audio (median / 95th percentile) | Farmers give up on long silences | ≤ 10 s / ≤ 20 s |
| Retrieval recall@5 | Whether the answer rests on the right document | ≥ 0.8 |

Every figure is reported with a 95% interval, because our samples are small:
- Wilson intervals for shares;
- resampling by speaker (not by utterance) for error rates;
- an upper bound when we see zero failures.

## 2. Monitoring signals once deployed

| Point on the architecture | Signal | What it would tell us | Degradation trigger |
|---|---|---|---|
| Browser (Zone 0) | Feedback and first-audio timings; abandons after echo-back | Latency or trust problems the server cannot see | 95th pct first audio > 20 s for a day; abandons > 2× baseline |
| Cloudflare, Traefik (TB1, TB2) | OTP requests; rate-limit hits; Turnstile failures | Abuse, cost attacks, slow extraction | > 3× baseline |
| `api`, speculative lane *(added 2026-10-02)* | Paid speculative work discarded after a "no", per user and in total; echo-back rejections per user | Denial of wallet: a script that rejects every echo-back | Any user above a provisional daily discarded-spend limit; total above 20% of the day's spend. Alerts before any provider cap is reached |
| `langgw`, reply from ASR (TB4) | Confidence distribution; language mismatch; corrections | Accent, dialect or noise shift; a missing farm term | Median confidence drops > 0.1 week on week |
| `api`, echo-back | Confirms and rejections | The farmer's verdict on what we heard | Rejections > 1.5× baseline for a week |
| `langgw`, reply from MT (TB4) | Placeholder survival; glossary misses; back-translation mismatches on safety sentences *(amended 2026-10-02)* | Translation corrupting numbers, terms or meaning | Survival < 95%; any rise in safety-sentence mismatches is reviewed within a day |
| `api`, reply from LLM (TB4) | Intent mix; unknown intents; invalid outputs | Questions we did not build for; model change | Unknown intent > 15% of a week; invalid > 2% |
| Embedder and search index | Top retrieval scores; "I don't know" rate by intent; corpus version | Documents no longer match questions | "I don't know" rate doubles for one intent |
| Guards in `api` | Verdicts by rule (pass, replace, block) | Drift towards unsafe content | Replacements > 2× baseline; every G-DOSE block reviewed within a day |
| `langgw`, reply from TTS (TB4) | Failures; cache hits | Silent answers | Failures > 2% |
| IoT intake (TB5) | Readings per hour; HMAC, replay (stale timestamp or reused nonce) and plausibility rejects; simulated readings in farmer turns | Sensor failure, spoofing, replay, fake data in advice | Node silent > 2× its interval; any replay reject; any simulated reading in a farmer turn |
| All external services (TB4) | Model version, errors, latency, spend per provider | Silent upstream change; outage; overspend | Any version change triggers the canary; spend > daily cap |
| Postgres (turn records) | Ratings; "that's wrong"; deletion requests | User-level quality, the slowest signal | Negative ratings > 30% of a week |
| Whole pipeline | **Canary:** weekly rerun of a frozen subset of the Twi test questions | Drift that live signals miss | INS on the subset falls outside its week-7 interval |

Every point writes to the same per-turn record (step timestamps, model versions, confidence, corrections, guard verdicts, fallbacks). Monitoring therefore needs no separate pipeline.

## 3. What we would not notice (known blind spots)

| Blind spot | Why our signals miss it | Mitigation |
|---|---|---|
| A poisoned source document with a plausible wrong dose | G-DOSE checks doses against the source itself | Hash and sign the source manifest; a second member diffs every corpus update |
| Quality loss for one group only (older speakers, another dialect) | Triggers watch averages | Report ASR confidence, rejections and the canary by age band and dialect |
| A wrong translation with no numbers in it | Echo-back checks what we heard, not what we translated | The first answer sentence restates the question in Twi; runtime back-translation of safety sentences *(added 2026-10-02)*; a back-translation sample of all sentences in the weekly canary. Residual: a meaning change in a sentence with no dose, product or warning |
| Slow extraction across many accounts | Each account stays under its rate limit | Watch total volume per question pattern across accounts |
