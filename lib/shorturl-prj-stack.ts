import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import {Code} from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import {AttributeType} from '@aws-cdk/aws-dynamodb';
import * as apigateway from '@aws-cdk/aws-apigateway';
import {generateUrl} from "../src/main";
import {LambdaIntegration} from "@aws-cdk/aws-apigateway";

export class ShorturlPrjStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const urlTable = new dynamodb.Table(this, 'ShortenedUrl', {
                tableName: 'ShortenedUrl',
                partitionKey: {
                    name: "id",
                    type: AttributeType.STRING
                }
            }
        )

        const handlerPath = (method: string) => `main.${method}`;

        // The code that defines your stack goes here
        const shortenUrlLambda = new lambda.Function(this, 'shortenUrlLambda', {
            timeout: cdk.Duration.seconds(5),
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: handlerPath('shortenUrl'),
            code: Code.fromAsset("./dist"),
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
            code: Code.fromAsset("./dist"),
            environment: {
                TABLE_NAME: urlTable.tableName
            }
        });

        urlTable.grantReadWriteData(generateUrlLambda);

        const api = new apigateway.RestApi(this, 'shortening-url');

        api.root.addMethod("POST", new LambdaIntegration(generateUrlLambda));
        api.root.addResource("{id}")
            .addMethod("GET", new LambdaIntegration(shortenUrlLambda));
    }
}
