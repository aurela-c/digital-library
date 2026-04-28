import { getChannel } from "../rabbitmq.js";

export const startBookConsumer = () => {
  const channel = getChannel();

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