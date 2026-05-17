import { getChannel } from "../rabbitmq.js";
import { createLogger } from "../../observability/logger.js";

const log = createLogger("book-service");

export const startBookConsumer = () => {
  const channel = getChannel();
  if (!channel) {
    log.warn("Event consumers skipped (no RabbitMQ channel)");
    return;
  }

  //borrowed
  channel.assertQueue("BOOK_BORROWED");

  channel.consume("BOOK_BORROWED", async (msg) => {
    const data = JSON.parse(msg.content.toString());

    console.log("BOOK_BORROWED event:", data);

    const { bookId } = data;

    console.log(`Book ${bookId} decreased by 1`);

    channel.ack(msg);
  });

  //returned
  channel.assertQueue("BOOK_RETURNED");

  channel.consume("BOOK_RETURNED", async (msg) => {
    const data = JSON.parse(msg.content.toString());

    console.log(" BOOK_RETURNED event:", data);
    const { bookId } = data;

    console.log(`Book ${bookId} increased by 1`);

    channel.ack(msg);
  });
};