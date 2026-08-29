# Release 3A.4 contract closure

Release 3A.4 does not activate progression or implement Release 3B.

## Executable policy binding

Policy artifacts carry the exact canonical executable representation used by the trusted loader. The loader verifies all artifact and config digests before selecting an immutable built-in implementation by `codeDigest`; unknown code fails with `POLICY_IMPLEMENTATION_NOT_REGISTERED`. Qualification and contribution functions supplied by callers are ignored. Contribution output is produced during qualification and stored in the identity-bound decision, so projection never executes caller-supplied policy behavior.

## QualificationDecision

The runtime contract is closed and requires every schema property. Identity covers event, policy artifact, all generations and evidence/correction context digests, projection context, cutoff/watermark/evaluation time, state, factor, complete contribution result, reason codes, evidence references, and bounded signals. Projection reconstructs the canonical decision and requires the submitted `decisionId` and `projectionContextId` to match.

## Producer authentication and corrections

Correction resolution accepts only a registry-issued `AuthenticatedProducerContext`, a module-issued producer registry, and a module-issued authorization contract. All three are opaque identity-branded objects: copying payload claims or supplying caller-defined `assertContext`/`authorize` callbacks cannot establish authority. The untrusted `provenance.producer` must match the authenticated producer but never establishes it. Authority class, type, target domain, evidence producer/version, effective time, and semantics remain independently checked.

Each target and authority-precedence sequence starts at 1 and advances contiguously. Input ordering does not affect resolution.

Compensation binds the original and compensating transaction references, amount, currency, payer, beneficiary/recipient, event type/class, direction/finality state, authenticated authority, and effective correction metadata. Mismatch fails closed. Economic credit ownership remains unresolved.

## Schema and semantic validation

The four Draft 2020-12 schemas describe the structurally expressible closed envelopes and bounds, including recursive policy metadata value types, per-object property/key limits, per-array item limits, and per-string limits. Runtime canonicalization is the mandatory second stage for cryptographic identities, digest recomputation, canonical timestamps/serialization, aggregate metadata node/depth limits, and sensitive-key detection at any nesting depth. JSON Schema cannot express the aggregate traversal limits or the case-insensitive sensitive-key policy with equivalent portable behavior. Consequently a policy containing `authenticationSecret` can be structurally schema-valid and is explicitly rejected by semantic validation; tests report these as separate stages and do not claim total JSON-Schema equivalence.
