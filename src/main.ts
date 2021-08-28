import * as AWS from 'aws-sdk';
import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from 'aws-lambda';
import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";
import GetItemOutput = DocumentClient.GetItemOutput;

const ddbClient = new AWS.DynamoDB();

const getTableName = (): string => {
    const value = process.env.TABLE_NAME;
    if (value) {
        return value;
    }

    throw "TABLENAME is not set";
}

const retrieveUrl = (value: GetItemOutput): string => {
    const url = value.Item?.url.S;
    if (url)
        return url;

    throw "url is not exist";
}

export const shortenUrl = async ({pathParameters}: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    if (!pathParameters) {
        throw 'path params are empty';
    }
    const {id} = pathParameters;

    const value = await ddbClient.getItem({
        TableName: getTableName(),
        Key: {
            id: {
                S: id
            }
        }
    }).promise();

    if (value) {
        const url = retrieveUrl(value);
        return {
            statusCode: 301,
            headers: {
                Location: url
            }
        }
    }
    return {
        statusCode: 404,
        body: 'error!'
    };
};

const generateId = () => {
    const value = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    const ret = [];

    for (let i = 0; i < 8; i += 1) {
        ret.push(value[Math.floor(Math.random() * value.length)]);
    }

    return ret.join("");
};

export const generateUrl = async ({body}: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    if (!body)
        throw 'error';

    const id = generateId();
    const {url} = JSON.parse(body);

    const value = await ddbClient.putItem({
        TableName: getTableName(),
        Item: {
            id: {
                S: id
            },
            url: {
                S: url
            }
        }
    }).promise();

    if (!value) {
        return {
            statusCode: 400
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            id
        })
    };
}