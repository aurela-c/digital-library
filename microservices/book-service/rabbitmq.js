import amqp from "amqplib";
import { createLogger } from "../observability/logger.js";
import { formatRabbitMqError } from "../observability/friendlyErrors.js";

let channel;
const log = createLogger("book-service");

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

    log.info("RabbitMQ connected");
    return channel;
  } catch (err) {
    log.warn(formatRabbitMqError(err));
    channel = undefined;
    return null;
  }
};

export const getChannel = () => channel;