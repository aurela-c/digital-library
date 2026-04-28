import amqp from "amqplib";

let channel;
let connection;

export const connectRabbitMQ = async () => {
  try {
    connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

    console.log("RabbitMQ connected");

    return channel;
  } catch (err) {
    console.error("RabbitMQ connection error:", err);
  }
};

export const getChannel = () => channel;