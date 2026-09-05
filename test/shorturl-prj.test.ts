import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ShorturlPrjStack } from '../lib/shorturl-prj-stack';
import { isReserved, validateUrl, generateId } from '../src/links';

const template = (): Template =>
  Template.fromStack(
    new ShorturlPrjStack(new App(), 'TestStack', {
      env: { account: '111111111111', region: 'us-east-1' },
      domainName: 'example.test',
      hostedZoneId: 'Z0000000000000000000',
      zoneName: 'example.test',
      tableName: 'ShortenedUrl'
    })
  );

describe('stack', () => {
  it('adopts the existing links table instead of declaring one', () => {
    // A declared table could be replaced, and the links are older than this stack.
    template().resourceCountIs('AWS::DynamoDB::Table', 0);
  });

  it('exposes only the redirect, since links are created over mail', () => {
    const methods = template().findResources('AWS::ApiGateway::Method');
    const verbs = Object.values(methods).map((m) => m.Properties.HttpMethod);
    expect(verbs).toEqual(['GET']);
  });

  it('runs on a supported runtime', () => {
    template().hasResourceProperties('AWS::Lambda::Function', { Runtime: 'nodejs22.x' });
  });
});

describe('url validation', () => {
  const own = ['gben.me'];

  it('accepts ordinary web links', () => {
    expect(validateUrl('https://example.com/a?b=c', own)).toEqual({
      ok: true,
      url: 'https://example.com/a?b=c'
    });
  });

  it('rejects schemes that would run as script on our own origin', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>']) {
      expect(validateUrl(bad, own).ok).toBe(false);
    }
  });

  it('rejects a link back at the shortener', () => {
    expect(validateUrl('https://gben.me/abc', own).ok).toBe(false);
  });

  it('rejects what is not a URL at all', () => {
    expect(validateUrl('   ', own).ok).toBe(false);
    expect(validateUrl('not a url', own).ok).toBe(false);
  });
});

describe('ids', () => {
  it('keeps discovery paths out of the link space', () => {
    for (const reserved of ['', 'favicon.ico', 'robots.txt', '.well-known/acme-challenge']) {
      expect(isReserved(reserved)).toBe(true);
    }
    expect(isReserved('xushqhnn')).toBe(false);
  });

  it('generates ids without look-alike characters', () => {
    const ids = Array.from({ length: 200 }, generateId);
    expect(ids.every((id) => /^[23456789abcdefghjkmnpqrstuvwxyz]{8}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
