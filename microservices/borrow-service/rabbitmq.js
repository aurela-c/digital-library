import amqp from "amqplib";
import { createLogger } from "../observability/logger.js";
import { formatRabbitMqError } from "../observability/friendlyErrors.js";
import { getRabbitMqUrl } from "../observability/config/rabbitmq.js";

let channel;
let connection;
const log = createLogger("borrow-service");

export const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect(getRabbitMqUrl());
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