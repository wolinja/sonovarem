# Main design decisions

| Decision | Why | What we give up |
|---|---|---|
| **Fixed pipeline, not an AI agent [O].** The LLM does four bounded jobs (intent and slots, the wording of a clarifying question, the answer, a session summary). Code picks the soil and weather tools from the question's intent | Every turn follows a known path, so each step has a time budget, the guards sit at fixed points, and each state can be unit-tested with a fake model. A prompt injection cannot make the system call a tool | Less graceful with odd, multi-part questions; these get "I don't know" with a next step |
| **English pivot.** Twi → English, reason, English → Twi | Our extension documents are in English, and LLM reasoning and retrieval in Twi are weak. Only English text reaches the LLM | Two translation hops of latency, and a risk to numbers (hence masking) |
| **Reusable language gateway (`langgw`) with language and domain packs [O]** | Speech engines can be swapped by configuration; the Twi layer can serve other apps and extend to Ewe | Some boundary work up front |
| **Guards on every sentence, before translation or speech, fail-closed** | The zero-violation target for doses must not depend on the model behaving | First audio slightly later than raw streaming |
| **Echo-back with speculative work [O]** | Catches ASR errors before advice is given; translation, planning and retrieval run while the echo plays | One wasted translation call when the farmer says "no" |
| **Privacy routing and ethics gates in configuration [O]** | Each turn carries a data class, and the gateway calls only providers allowed for it. No external farmer uses voice until the IRB approval and Data Protection Commission registration references are set | One more concept every developer must respect |
| **Modular monolith on one Hetzner VPS behind Traefik and Cloudflare [O]** | Four people, eleven weeks, USD 1,000. One deploy, and one database transaction deletes a user everywhere | No independent scaling, which the proof of concept does not need |
