import bcrypt from "bcrypt";

const run = async () => {
  const hash = await bcrypt.hash("admin123", 10);
  console.log("HASH:", hash);
};

run();