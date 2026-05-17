/**
 * RabbitMQ connection URL for amqplib.
 */
export function getRabbitMqUrl() {
  return (
    process.env.RABBITMQ_URL ||
    process.env.AMQP_URL ||
    "amqp://localhost"
  );
}
