import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as ShorturlPrj from '../lib/shorturl-prj-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ShorturlPrj.ShorturlPrjStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
