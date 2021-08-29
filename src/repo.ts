import * as AWS from 'aws-sdk';
import { AttributeMap } from 'aws-sdk/clients/dynamodb';

const ddbClient = new AWS.DynamoDB();

const getTableName = (): string => {
  const value = process.env.TABLE_NAME;
  if (value) {
    return value;
  }

  throw 'TABLE_NAME is not set';
};

export type ShortenedUrl = {
  id: string;
  url: string;
};

const toShortenedUrl = ({ id, url }: AttributeMap): ShortenedUrl => {
  if (!id.S || !url.S) {
    throw 'something is bad';
  }

  return {
    id: id.S,
    url: url.S
  };
};

export const getShortenedUrl = async (id: string): Promise<ShortenedUrl> => {
  const result = await ddbClient
    .getItem({
      TableName: getTableName(),
      Key: {
        id: {
          S: id
        }
      }
    })
    .promise();

  if (!result.Item) throw 'item not exist!';

  return toShortenedUrl(result.Item);
};

export const putShortenedUrl = async (
  id: string,
  url: string
): Promise<boolean> => {
  const result = await ddbClient
    .putItem({
      TableName: getTableName(),
      Item: {
        id: {
          S: id
        },
        url: {
          S: url
        }
      }
    })
    .promise();

  if (!result) return false;

  // eslint-disable-next-line no-console
  console.log(result.Attributes);
  return true;
};
