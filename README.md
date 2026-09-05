# gben.me URL shortener

Short links live at the root of `gben.me`, so `https://gben.me/<id>` is the whole of the public
surface. Links are created over mail, not over HTTP.

## Why mail

The service needs to be usable by exactly one person without building an account system for one
person. There is already a mail server on this domain that knows who is who, so a link is created
by sending mail to `url-shortener@gben.me`:

    Subject: shortenUrl
    Body:    https://example.com/the-long-one

and the reply carries the short link. Forging the `From` header gains nothing, because the reply
goes to the real mailbox behind that address, and an id is unguessable.

## Layout

| path | what |
|---|---|
| `lib/shorturl-prj-stack.ts` | CDK stack: redirect Lambda, API Gateway, apex domain, certificate |
| `src/main.ts` | Lambda handlers |
| `src/links.ts` | id generation, URL validation, reserved paths |
| `src/repo.ts` | DynamoDB access |

The `ShortenedUrl` table is *adopted*, not declared. It predates this stack (2021) and still
holds the original links; declaring it here would let CloudFormation delete it.

## Deploying

Push to `main`. The workflow tests, deploys, and then follows a real link - a deploy that leaves
the domain answering 404 is a failed deploy even when CloudFormation is satisfied.

By hand:

    npm install
    npm test
    npx cdk deploy ShorturlApexStack

Everything is in `us-east-1`: an edge-optimised API domain needs its certificate there, and the
table has always been there.

## Notes

- Redirects are **302**. The original 301 was cached by browsers forever, so a link could never
  be repointed or withdrawn, and no visit after the first was ever seen by the service.
- Ids avoid vowels and look-alike characters, so they survive being read aloud or retyped.
- `/.well-known/*`, `robots.txt` and `favicon.ico` are never handed out as link ids.
