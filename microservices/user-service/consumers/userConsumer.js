import { getChannel } from "../rabbitmq.js";
import { createLogger } from "../../observability/logger.js";

const log = createLogger("user-service");

export const startUserConsumer = () => {
  const channel = getChannel();
  if (!channel) {
    log.warn("Event consumers skipped (no RabbitMQ channel)");
    return;
  }

  // borrowed
  channel.assertQueue("BOOK_BORROWED");

  channel.consume("BOOK_BORROWED", async (msg) => {
    const data = JSON.parse(msg.content.toString());

    console.log(" USER BORROWED EVENT:", data);

    const { userId, bookId } = data;

    console.log(`User ${userId} borrowed book ${bookId}`);

    channel.ack(msg);
  });

  // returned 
  channel.assertQueue("BOOK_RETURNED");

  channel.consume("BOOK_RETURNED", async (msg) => {
    const data = JSON.parse(msg.content.toString());

    console.log(" USER RETURNED EVENT:", data);

    const { userId, bookId } = data;

    console.log(`User ${userId} returned book ${bookId}`);

    channel.ack(msg);
  });
};