import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2
} from 'aws-lambda';
import { countHit, getShortenedUrl } from './repo.js';
import { shorten, validateUrl } from './links.js';

const ownHosts = (): string[] =>
  (process.env.OWN_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
});

/**
 * Follows a short link.
 *
 * 302, not the 301 this used to send: a permanent redirect is cached by the browser forever, so
 * a link could never be repointed or withdrawn once anyone had visited it, and no hit after the
 * first would ever reach us.
 */
export const shortenUrl = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters?.id;
  if (!id) return json(400, { error: 'no id in path' });

  const found = await getShortenedUrl(id);
  if (!found) return json(404, { error: 'no such link' });

  await countHit(id);
  return {
    statusCode: 302,
    headers: { location: found.url, 'cache-control': 'no-store' }
  };
};

/** Creates a short link. Reachable only from the mail command handler, never from the internet. */
export const generateUrl = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) return json(400, { error: 'empty body' });

  let requested: string;
  try {
    requested = (JSON.parse(event.body) as { url?: string }).url ?? '';
  } catch {
    return json(400, { error: 'body is not JSON' });
  }

  const checked = validateUrl(requested, ownHosts());
  if (!checked.ok) return json(400, { error: checked.reason });

  const id = await shorten(checked.url);
  return json(201, { id, url: checked.url });
};
