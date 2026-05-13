import amqp from "amqplib";

let channel;

export const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

    console.log("Book Service connected to RabbitMQ");
    return channel;
  } catch (err) {
    console.error("RabbitMQ connection error:", err.message || err);
    channel = undefined;
    return null;
  }
};

export const getChannel = () => channel;