# Sonovarem specification

This directory holds the **scope and architecture specification** for Sonovarem. The ICS 591 brief requires it. It is a living document: later milestones (M2, M3) **amend these files in place** rather than replace them, and every change is recorded in [CHANGELOG.md](CHANGELOG.md).

| File | What it specifies |
|---|---|
| [scope.md](scope.md) | The problem, users, intelligent experience, success criteria, when the system defers, degrades or declines, who bears the cost, and what is out of scope |
| [architecture.md](architecture.md) | Containers and trust boundaries, the learned-component boundary and what crosses it, interfaces, failure modes, operational dependencies, and data |
| [measurement.md](measurement.md) | What we measure, where each signal is recorded, degradation triggers, and the blind spots we know about |
| [decisions.md](decisions.md) | The main design decisions and what each one costs us |
| [CHANGELOG.md](CHANGELOG.md) | How the specification has changed, milestone by milestone |

**Status:** Milestone 1 (2026-10-01). This is a design: there are no measurements yet. Every target is provisional and will be reset once, in writing, when the first measurements exist (week 7).

**Conventions:**
- [O] marks an owner decision.
- [A] marks an assumption we still have to test.
- "INS" is our north-star metric (see [scope.md](scope.md#4-success-criteria)).
