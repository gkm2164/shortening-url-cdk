import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getShortenedUrl, putShortenedUrl } from './repo';

export const shortenUrl = async ({
  pathParameters
}: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!pathParameters || !pathParameters.id) {
    throw 'path params are empty';
  }
  const { id } = pathParameters;

  const value = await getShortenedUrl(id);

  if (value) {
    return {
      statusCode: 301,
      headers: {
        Location: value.url
      }
    };
  }
  return {
    statusCode: 404,
    body: 'error!'
  };
};

const generateId = () => {
  const value =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const ret = [];

  for (let i = 0; i < 8; i += 1) {
    ret.push(value[Math.floor(Math.random() * value.length)]);
  }

  return ret.join('');
};

export const generateUrl = async ({
  body
}: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!body) throw 'error';

  const id = generateId();
  const { url } = JSON.parse(body);

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
