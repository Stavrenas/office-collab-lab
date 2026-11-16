# Test matrix (from evaluation plan)

Pass evidence should include evidence-stream events and storage revision hashes.

| ID | Scenario | Pass evidence |
|---|---|---|
| INT-01 | Launch from authenticated application | Correct document and user; no public file exposure |
| INT-02 | Read-only launch | Server-side write attempts are rejected |
| INT-03 | Same document, two users | Both join the intended session and see changes |
| INT-04 | Same filename across tenants | No session/cache/content crossover |
| SAV-01 | Edit, close, reopen | Changes exist in application storage |
| SAV-02 | Intermediate save | Documented snapshot/final-save semantics |
| SAV-03 | Duplicate save callback | No duplicate corruption or unintended revisions |
| SAV-04 | Out-of-order save events | Newer document state is not overwritten |
| SAV-05 | Application storage unavailable | Visible failure or reliable recovery |
| SAV-06 | External modification during editing | Explicit conflict policy |
| COL-01 | Concurrent edits in same paragraph/cell | Consistent or documented conflict behavior |
| COL-02 | Browser disconnect/reconnect | Recovery and data-loss window recorded |
| COL-03 | Last editor closes unexpectedly | Final persistence outcome recorded |
| RES-01 | Editor container killed during editing | Recoverable state or quantified loss |
| RES-02 | Host application restarted | Save/download retries behave safely |
| RES-03 | Editor recreated | Required state and secrets survive |
| SEC-01 | Expired/invalid credentials | Request rejected |
| SEC-02 | Wrong-user/wrong-document credential | Request rejected |
| SEC-03 | Forged save request | Rejected before download or write |
| SEC-04 | Download URL targets internal service | Blocked |
| SEC-05 | Permission revoked mid-session | Behavior measured |
| OPS-01 | Controlled upgrade and rollback | Documents remain usable |
| OPS-02 | Backup and restore | Application files recover |
| MOB-01 | Actual iOS/Android browser, if required | Edit/save on eligible editions |

## Persistence evidence chain

```text
test ID
  -> editor session
  -> callback/WOPI request
  -> received content hash
  -> application revision
  -> stored content hash
  -> reopened content verification
```
