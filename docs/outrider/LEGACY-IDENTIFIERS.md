# Outrider legacy identifiers

Outrider is the canonical product, UI, and architecture name. The visible application uses only Outrider terminology.

The following pre-existing internal identifiers retain `Glass` temporarily because changing them would affect persisted collection names, module paths, imports, configuration, tests, or operational contracts:

- `OutriderGlassAudit` and the `outrider_glass_audit` MongoDB collection
- `GlassGateway`, `CyberdopeGlassAdapter`, and `glassGateway.js`
- `OUTRIDER_GLASS_ENABLED`
- `glassEnabled`, `listGlassAudits`, and `appendGlassAudit`
- `CROSS_GLASS` and `GLASS_*` internal error codes
- historical Phase 0–2 documentation filenames and descriptions
- `OutriderGlass.tsx`, retained as a source filename only

Any later rename needs an explicit compatibility and data-migration plan. These identifiers are not separate products and do not grant Outrider direct access to CyberDope application authority.
