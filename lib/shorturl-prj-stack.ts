import { Duration, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as path from 'node:path';

export interface ShorturlStackProps extends StackProps {
  /** The domain links are served from. Short links are its whole path space. */
  readonly domainName: string;
  readonly hostedZoneId: string;
  readonly zoneName: string;
  /** Table that already holds the links; adopted, never recreated. */
  readonly tableName: string;
}

export class ShorturlPrjStack extends Stack {
  constructor(scope: Construct, id: string, props: ShorturlStackProps) {
    super(scope, id, props);

    // The links predate this stack, so the table is adopted rather than declared. Letting CDK
    // own it would mean a replacement could take the existing links with it.
    const urlTable = dynamodb.Table.fromTableName(this, 'ShortenedUrl', props.tableName);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.zoneName
    });

    // An edge-optimized API domain needs its certificate in us-east-1, and a wildcard does not
    // cover the apex, so this is issued for the apex itself and validated through the zone.
    const certificate = new acm.Certificate(this, 'ApexCertificate', {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    const redirect = new NodejsFunction(this, 'redirectLambda', {
      entry: path.join(__dirname, '..', 'src', 'main.ts'),
      handler: 'shortenUrl',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(5),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        TABLE_NAME: props.tableName,
        OWN_HOSTS: props.domainName
      }
    });
    urlTable.grantReadWriteData(redirect); // read to resolve, write to count the hit

    // Only the redirect is exposed. Links are created over mail, by a listener that writes to
    // the table directly, so there is no create endpoint on the internet to abuse or defend.
    const api = new apigateway.RestApi(this, 'shortening-url', {
      restApiName: 'shorturl',
      description: 'Follows short links; creation happens over mail.',
      deployOptions: { stageName: 'prod', throttlingBurstLimit: 200, throttlingRateLimit: 100 },
      endpointConfiguration: { types: [apigateway.EndpointType.EDGE] }
    });
    api.root.addResource('{id}').addMethod('GET', new apigateway.LambdaIntegration(redirect));

    const customDomain = new apigateway.DomainName(this, 'ApexDomain', {
      domainName: props.domainName,
      certificate,
      endpointType: apigateway.EndpointType.EDGE
    });
    new apigateway.BasePathMapping(this, 'ApexMapping', { domainName: customDomain, restApi: api });

    new route53.ARecord(this, 'ApexAlias', {
      zone: hostedZone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(customDomain))
    });

    this.exportValue(customDomain.domainNameAliasDomainName, { name: 'ShorturlApexAlias' });
    void RemovalPolicy.RETAIN;
  }
}
