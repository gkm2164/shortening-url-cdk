import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getShortenedUrl, putShortenedUrl } from './repo';
import * as _ from 'underscore';

export const shortenUrl = async ({
  pathParameters
}: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!pathParameters || !pathParameters.id) {
    throw 'path params are empty';
  }
  const { id } = pathParameters;
  try {
    const value = await getShortenedUrl(id);
    return {
      statusCode: 301,
      headers: {
        Location: value.url
      }
    };
  } catch (e) {
    return {
      statusCode: 404,
      body: JSON.stringify(e)
    };
  }
};

const generateId = () => {
  const value =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  return _.range(10)
    .map(() => Math.floor(Math.random() * value.length))
    .map((idx) => value[idx])
    .join('');
};

export const generateUrl = async ({
  body
}: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!body) {
    return {
      statusCode: 400,
      body: 'empty body'
    };
  }

  const id = generateId();
  const { url } = JSON.parse(body) as { url: string };

  const value = await putShortenedUrl(id, url);

  if (!value) {
    return {
      statusCode: 400
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      id
    })
  };
};
