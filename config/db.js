const mongoose = require('mongoose');
require('dotenv').config({ path: 'variables.env' });

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.DB_MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("🎰 Database connected");
  } catch (error) {
    console.log("Error al conectar DB");
    console.log(error);
    process.exit(1);
  }
}

module.exports = conectarDB;