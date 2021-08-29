import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { Code } from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { AttributeType } from '@aws-cdk/aws-dynamodb';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { EndpointType, LambdaIntegration } from '@aws-cdk/aws-apigateway';
import * as route53 from '@aws-cdk/aws-route53';
import * as acm from '@aws-cdk/aws-certificatemanager';

export class ShorturlPrjStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const urlTable = new dynamodb.Table(this, 'ShortenedUrl', {
      tableName: 'ShortenedUrl',
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      }
    });

    const handlerPath = (method: string) => `main.${method}`;

    // The code that defines your stack goes here
    const shortenUrlLambda = new lambda.Function(this, 'shortenUrlLambda', {
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: handlerPath('shortenUrl'),
      code: Code.fromAsset('./dist'),
      environment: {
        TABLE_NAME: urlTable.tableName
      }
    });

    urlTable.grantReadData(shortenUrlLambda);

    // The code that defines your stack goes here
    const generateUrlLambda = new lambda.Function(this, 'generateUrlLambda', {
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: handlerPath('generateUrl'),
      code: Code.fromAsset('./dist'),
      environment: {
        TABLE_NAME: urlTable.tableName
      }
    });

    urlTable.grantReadWriteData(generateUrlLambda);

    const api = new apigateway.RestApi(this, 'shortening-url');

    api.root.addMethod('POST', new LambdaIntegration(generateUrlLambda));
    api.root.addCorsPreflight({
      allowOrigins: ['*']
    });

    const idApi = api.root.addResource('{id}');
    idApi.addMethod('GET', new LambdaIntegration(shortenUrlLambda));
    idApi.addCorsPreflight({
      allowOrigins: ['*']
    });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'gben.link',
      {
        zoneName: 'gben.link',
        hostedZoneId: 'Z0443465O8H9UEIO6Q4Q'
      }
    );

    const cert = acm.Certificate.fromCertificateArn(
      this,
      'all.gben.link',
      'arn:aws:acm:us-east-1:842390211626:certificate/bd0cceb0-7794-41db-aa87-5f22ea94ae3b'
    );

    const customDomain = new apigateway.DomainName(this, 'hello.gben.link', {
      domainName: 'hello.gben.link',
      certificate: cert,
      endpointType: EndpointType.EDGE
    });

    new apigateway.BasePathMapping(this, 'hello.gben.link-pathMapping', {
      domainName: customDomain,
      restApi: api
    });

    new route53.CnameRecord(this, 'ApiGatewayRecordSet', {
      zone: hostedZone,
      recordName: 'hello',
      domainName: customDomain.domainNameAliasDomainName
    });
  }
}
