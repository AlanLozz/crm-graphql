const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

const crearToken = (usuario, secreto, expiresIn) => {
  const {id, email, nombre, apellido} = usuario;
  return jwt.sign({id, email, nombre, apellido}, secreto, {expiresIn});
};

const resolvers = {
  Query: {
    obtenerUsuario: async (_, {token}) => {
      const usuarioId = await jwt.verify(token, process.env.SECRET);
      return usuarioId;
    }, obtenerProductos: async () => {
      try {
        const productos = await Producto.find();
        return productos;
      } catch (e) {
        console.log(e);
      }
    }, obtenerProducto: async (_, {id}) => {
      const producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("El producto no existe");
      }
      return producto
    }, obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find();
        return clientes;
      } catch (e) {
        console.log(e);
      }
    }, obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({vendedor: ctx.usuario.id.toString()});
        return clientes;
      } catch (e) {
        console.log(e);
      }
    }, obtenerCliente: async (_, {id}, ctx) => {
      // Revisar si el cliente existe o no
      const cliente = await Cliente.findOne({_id: id});
      if (!cliente) {
        throw new Error("El cliente no existe");
      }
      // Quien puede verlo
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      return cliente;
    }, obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find();
        return pedidos;
      } catch (e) {
        console.log(e);
      }
    }, obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({vendedor: ctx.usuario.id});
        return pedidos;
      } catch (e) {
        console.log(e);
      }
    }, obtenerPedido: async (_, {id}, ctx) => {
      // Verificar existencia pedido
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no fue encontrado");
      }
      // Solo quien puede verlo
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("Acción no permitida");
      }
      // Resultado
      return pedido;
    },
    obtenerPedidosEstado: async (_, {estado}, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
      if (!pedidos) {
        throw new Error("Ha ocurrido un error interno");
      }
      return pedidos;
    },
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match : { estado : "COMPLETADO" } },
        { $group : {
            _id: "$cliente",
            total : { $sum : '$total' }
        }},
        {
          $lookup : {
            from: 'clientes',
            localField: '_id',
            foreignField: "_id",
            as: "cliente"
          }
        },
        {
          $sort : {total: -1}
        }
      ]);
      return clientes;
    },
    TopVendedor: async() => {

    }
  }, Mutation: {
    nuevoUsuario: async (_, {input}) => {
      const {email, password} = input;
      // Revisar si el usuario existe
      const isRegistered = await Usuario.findOne({email});
      if (isRegistered) {
        throw new Error('El usuario ya está registrado');
      }

      // Hash password
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt);

      // Guardar en BD
      try {
        const usuario = new Usuario(input);
        await usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    }, autenticarUsuario: async (_, {input}) => {
      const {email, password} = input;

      // Revisar si el usuario existe
      const exists = await Usuario.findOne({email});

      if (!exists) {
        throw new Error('El usuario no existe');
      }

      // Revisar password
      const verifyPassword = await bcryptjs.compare(password, exists.password);
      if (!verifyPassword) {
        throw new Error('El password es incorrecto');
      }

      // Crear token
      return {
        token: crearToken(exists, process.env.SECRET, '24h')
      }

    }, nuevoProducto: async (_, {input}) => {
      try {
        const nuevoProducto = new Producto(input);

        // Almacenar en BD
        const resultado = nuevoProducto.save();
        return resultado;
      } catch (e) {
        console.log(e);
      }
    }, actualizarProducto: async (_, {id, input}) => {
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("El producto no existe");
      }
      producto = await Producto.findOneAndUpdate({_id: id}, input, {new: true});
      return producto;
    }, eliminarProducto: async (_, {id}) => {
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("El producto no existe");
      }
      await Producto.findOneAndDelete({_id: id});
      return "Producto eliminado";
    }, nuevoCliente: async (_, {input}, ctx) => {
      // Verificar si el cliente ya esta registrado
      const {email} = input;
      const cliente = await Cliente.findOne({email});
      if (cliente) {
        throw new Error("Ese cliente ya esta registrado");
      }
      // Asignar vendedor

      // Guardado en base
      const nuevoCliente = new Cliente(input);
      nuevoCliente.vendedor = ctx.usuario.id;
      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (e) {
        console.log(e);
      }
    }, actualizarCliente: async (_, {id, input}, ctx) => {
      // Verificar existencia cliente
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El cliente no existe");
      }
      // Verificar vendedor
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      // Actualizar cliente
      cliente = await Cliente.findOneAndUpdate({_id: id}, input, {new: true});
      return cliente;
    }, eliminarCliente: async (_, {id}, ctx) => {
      // Verificar existencia de cliente
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El cliente no existe");
      }
      // Verificar vendedor
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      // Eliminar cliente
      Cliente.findOneAndUpdate({_id: id});
      return "Cliente eliminado satisfactoriamente."
    }, nuevoPedido: async (_, {input}, ctx) => {
      const {cliente} = input;
      // Verificar si el cliente existe
      let clienteExistente = await Cliente.findById(cliente);
      if (!clienteExistente) {
        throw new Error("El cliente no existe");
      }

      // Verificar si el cliente es del vendedor
      if (clienteExistente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      // Revisar que el stock este disponible
      for await (const articulo of input.pedido) {
        const {id, cantidad} = articulo;
        const producto = await Producto.findById(id);
        if (articulo.cantidad > producto.existencia) {
          throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`);
        } else {
          producto.existencia = producto.existencia - cantidad;
          await producto.save();
        }
      }
      // Crear nuevo pedido
      const nuevoPedido = new Pedido(input);
      // Asignarle el vendedor
      nuevoPedido.vendedor = ctx.usuario.id;
      // Guardado en base
      const resultado = await nuevoPedido.save();
      return resultado;
    },
    actualizarPedido: async (_, {id, input}, ctx) => {
      const {cliente} = input;
      // Verificar existencia pedido
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("El pedido no existe");
      }
      // Verificar si el cliente existe
      const existeCliente = await Cliente.findById(cliente);
      if (!existePedido) {
        throw new Error("El cliente no existe");
      }
      // Verificar el vendedor del cliente y pedido
      if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      // Revisar stock
      if (input.pedido) {
        for await (const articulo of input.pedido) {
          const {id, cantidad} = articulo;
          const producto = await Producto.findById(id);
          if (articulo.cantidad > producto.existencia) {
            throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`);
          } else {
            producto.existencia = producto.existencia - cantidad;
            await producto.save();
          }
        }
      }

      // Guardar pedido
      const resultado = Pedido.findOneAndUpdate({_id: id}, input, {new: true});
      return resultado;
    },
    eliminarPedido: async (_, {id}, ctx) => {
      // Verificar existencia del pedido
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("El pedido no existe");
      }
      // Verificar si el vendedor corresponde al pedido
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      // Eliminar pedido
      await Pedido.findOneAndDelete({_id: id});
      return "Pedido eliminado satisfactoriamente";
    }
  }
};

module.exports = resolvers;