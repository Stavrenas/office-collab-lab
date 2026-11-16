# Architecture decision record (template)

```text
Decision:
Selected candidate and exact edition/version:
Required workflows:
Mandatory gates passed:
Measured strengths:
Measured weaknesses:
Rejected alternatives and reasons:
Remaining blockers:
Production support/security ownership:
Re-evaluation trigger:
```

Hard gates before scoring:

- No unresolved critical security exposure accepted by the team
- No silent loss in mandatory persistence/recovery tests
- No cross-tenant access or cache leakage
- Required formats survive agreed round-trip tests
- Mandatory mobile functionality available in the selected edition
- License obligations fit the intended deployment/distribution model
