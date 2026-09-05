#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ShorturlPrjStack } from '../lib/shorturl-prj-stack';

const app = new cdk.App();

// A separate stack from the 2021 ShorturlPrjStack on purpose. That stack declared the links
// table, so removing the declaration here would have CloudFormation delete it - and the links
// with it. This one adopts the table and leaves ownership where it is.
new ShorturlPrjStack(app, 'ShorturlApexStack', {
  // Edge-optimised API domains and their certificates must live in us-east-1, and the links
  // table has been there since 2021.
  env: { account: process.env.CDK_DEFAULT_ACCOUNT ?? '842390211626', region: 'us-east-1' },
  domainName: 'gben.me',
  hostedZoneId: 'Z0929349277K57AFKVM9M',
  zoneName: 'gben.me',
  tableName: 'ShortenedUrl'
});
