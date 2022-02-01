const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  existencia: {
    type: Number,
    required: true,
  },
  precio: {
    type: Number,
    required: true,
    trim: true
  }
}, {timestamps: true});

module.exports = mongoose.model('Producto', ProductoSchema);