import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

const tableName = (): string => {
  const value = process.env.TABLE_NAME;
  if (!value) throw new Error('TABLE_NAME is not set');
  return value;
};

export type ShortenedUrl = {
  id: string;
  url: string;
  createdAt?: string;
  createdBy?: string;
  hits?: number;
};

export const getShortenedUrl = async (
  id: string
): Promise<ShortenedUrl | undefined> => {
  const { Item } = await ddb.send(
    new GetCommand({ TableName: tableName(), Key: { id } })
  );
  return Item as ShortenedUrl | undefined;
};

/**
 * Writes the link only if that id is free. The original put had no condition, so a generated id
 * that happened to collide silently replaced somebody else's link; the caller retries instead.
 */
export const putShortenedUrl = async (
  id: string,
  url: string,
  createdBy?: string
): Promise<boolean> => {
  try {
    await ddb.send(
      new PutCommand({
        TableName: tableName(),
        Item: { id, url, createdAt: new Date().toISOString(), createdBy, hits: 0 },
        ConditionExpression: 'attribute_not_exists(id)'
      })
    );
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw e;
  }
};

/** Best-effort: a redirect must not fail because the counter could not be bumped. */
export const countHit = async (id: string): Promise<void> => {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { id },
        UpdateExpression: 'SET hits = if_not_exists(hits, :zero) + :one',
        ExpressionAttributeValues: { ':zero': 0, ':one': 1 }
      })
    );
  } catch {
    // ignore
  }
};
