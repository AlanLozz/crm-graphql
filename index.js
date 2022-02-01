const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

// Conectar a la base de datos
conectarDB();

// Servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({req}) => {
    const token = req.headers['authorization'] || '';
    if (token) {
      try {
        const usuario = jwt.verify(token, process.env.SECRET);
        return {
          usuario
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
});

// Arrancar servidor
server.listen(3990).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});