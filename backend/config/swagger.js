import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Digital Library API",
      version: "1.0.0",
      description: "API documentation for the Digital Library system"
    },
    servers: [
      {
        url: "http://localhost:5000"
      }
    ]
  },
  apis: ["./routes/auth.js", "./routes/borrow.js"]
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;