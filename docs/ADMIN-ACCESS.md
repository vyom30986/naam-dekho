# Admin access

How someone gets into the founder console, and how they are removed again.

This exists because handing the codebase to an outside team should not mean
handing over the product's own Google account, and because access given has to
be access that can be taken back.

## Two kinds of entry

| | Where it lives | Who can add | Who can remove |
|---|---|---|---|
| **Owner** | `ADMIN_EMAILS` in `backend/.env` | Editing the environment and restarting | **Nobody, from the console** |
| **Granted** | the `admin_grants` table | an owner, from the console | an owner, from the console |

The asymmetry is the point. An access screen that can delete its own owner is
one wrong click from locking the founder out of their product with no way back
in. So the owner list is deliberately somewhere the running application cannot
write to. Attempting to revoke an owner returns `403 owner_locked`, and the
screen renders no remove button for an owner row at all, rather than a disabled
one that would fail if pressed.

## What each kind can do

Both see the same customer data. The only difference is the access list itself.

| Action | Owner | Granted |
|---|---|---|
| Open every console screen | yes | yes |
| Read the access list | yes | yes |
| Grant access to somebody | yes | **no**, `403 owner_only` |
| Revoke a granted admin | yes | **no**, `403 owner_only` |
| Revoke an owner | **no**, `403 owner_locked` | no |

A granted admin can see who else has access, because a person should be able to
see who else can read the data they are working with. They cannot change the
list, so a contractor cannot quietly add a colleague.

## Using it

The screen is **Admin access**, last in the console sidebar. It is last because
it is used rarely and is the most consequential screen in the console.

To let a developer in, enter the Google address they actually sign in with. Any
other address will simply never match anybody, because the check runs against
the email on their Google identity. The note field is optional and worth
filling in: six months later `ravi@example.com` tells you nothing, and
`Dev team, Ravi` tells you everything.

To take access back, press Remove on their row. It takes effect on their very
next request.

## How the check works

`requireAdmin()` in `backend/src/api/admin.ts` runs on every admin route:

1. Resolve the signed in user's email from their session.
2. Is it in `ADMIN_EMAILS`? If so, they are an owner. Done.
3. Otherwise, query `admin_grants`. If the email is there, they are in as a
   granted admin.
4. Otherwise `403`, naming the account they are actually signed in as, because
   "not an admin" is useless advice when you have two Google accounts and the
   chooser picked the other one.

Step 3 is a live database read on every request, deliberately not cached.
Revoking someone has to take effect immediately, not whenever a cache expires.
The cost is one indexed primary key lookup on a table with a handful of rows.

The gate returns `isOwner` alongside `ok`, and the grant and revoke routes check
it. Authorisation is never decided in the browser: hiding a button is a
courtesy, the server refusal is the control.

`isAdminIdentity()` is a separate, synchronous, environment-only check used by
`/v1/me` to decide whether to offer the console link in the customer header. A
granted admin is not offered that link automatically and has to navigate to
`/admin` directly. That is a missing convenience rather than a missing
permission, and it keeps a hot, frequently called path off the database.

## Audit

Every grant and revoke is written to `audit_log` before the change is reported
as successful, with the actor, the address and the note. `admin.access.grant`
and `admin.access.revoke` are the action names. They show up in the **Audit log**
screen alongside every other admin mutation.

## Tested behaviour

These were exercised against the running server rather than reasoned about:

| | Rule | Result |
|---|---|---|
| 1 | An owner can read the list | pass |
| 2 | A stranger is refused before any grant | pass, 403 |
| 3 | An owner can grant access | pass |
| 4 | The granted person can then open the console | pass |
| 5 | The granted person cannot grant | pass, `owner_only` |
| 6 | The granted person cannot revoke the owner | pass, `owner_only` |
| 7 | An owner cannot revoke an owner either | pass, `owner_locked` |
| 8 | Granting an existing owner is refused as redundant | pass, `already_owner` |
| 9 | An owner can revoke a granted admin | pass |
| 10 | The revoked person loses access on the next request | pass, 403 |

## Before you hand access to anyone

Two things in `docs/KNOWN-ISSUES.md` bear directly on this and are worth doing
first:

- **The API keys screen password is four digits.** It is checked against
  `ADMIN_API_PASSWORD`, and the current value is a common weak one that the
  code's own rules would now reject. Anyone with console access who guesses it
  reaches the third party API keys. Change it before granting anybody access.
- **Console access is full access.** There is no read-only role. A granted
  admin can change pricing, edit the name corpus and see every customer's
  email. Grant it to people you would give those powers to, and remove it on
  the day the work ends rather than the day somebody remembers.

## Adding or changing an owner

Owners are environment configuration, not data:

```bash
# backend/.env
ADMIN_EMAILS=founder@example.com,cofounder@example.com
```

Comma separated, whitespace ignored, matched case insensitively. Restart the
backend afterwards. `ADMIN_PHONES` is still read for accounts created under the
old OTP sign in and can be left empty.

If `ADMIN_EMAILS` is empty, every admin route answers `503
admin_not_configured` rather than letting anybody in. Failing closed is the
correct direction for an access check.
