import Redis from "ioredis";
const redisClient = new Redis(process.env.REDIS_URL as string);

redisClient.once("connect", (err) => {
  console.log("Connected to redis");
});

export const setRedisKey = async (
  key: string,
  value: any,
  timeLimit?: number
) => {
  if (!timeLimit) {
    return await redisClient.set(key, value);
  } else {
    return await redisClient.set(key, value, "EX", timeLimit);
  }
};

export const getRedisKey = async (key: string) => {
  return await redisClient.get(key);
};

export const deleteRedisKey = async (key: string) => {
  return await redisClient.del(key);
};
