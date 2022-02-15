const Product = require('../models/product');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ITEMS_PER_PAGE = 2;

exports.getProducts = async (req, res, next) => {
  const page = req.query.page || 1;
  try {
    let totalItems = await Product.count();
    const lastPage = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const products = await Product.findAll({
      offset: (page - 1) * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE
    });
    res.render('shop/product-list', {
      prods: products,
      pageTitle: 'All Products',
      path: '/products',
      currentPage: +page,
      lastPage,
    });
  }
  catch(err) {
    console.log(err);
    return next(new Error(err));
  }
};

exports.getProductDetail = async (req, res, next) => {
  const productId = req.params.productId;
  try {
    const product = await Product.findByPk(productId);
    if (!product){
      return res.redirect('/');
    }
    res.render('shop/product-detail', {
      product,
      pageTitle: product.title,
      path: '/products/' + product.id,
    })
  }
  catch (err){
    console.log(err);
    return next(new Error(err));
  }
}

exports.getIndex = async (req, res, next) => {
  const page = req.query.page || 1;
  try {
    let totalItems = await Product.count();
    const lastPage = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const products = await Product.findAll({
      offset: (page - 1) * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE
    });
    res.render('shop/index', {
      prods: products,
      pageTitle: 'All Products',
      path: '/products',
      currentPage: +page,
      lastPage,
    });
  }
  catch(err) {
    console.log(err);
    return next(new Error(err));
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const cart = await req.user.getCart();
    const products = await cart.getProducts();
    let totalPrice = 0;
    products.forEach(prod => {
      totalPrice += prod.price * prod.CartItem.quantity;
    })
    res.render('shop/cart', {
      products,
      path: '/cart',
      pageTitle: 'Your Cart',
      totalPrice,
    })
  }
  catch (err) {
    console.log(err);
    return next(new Error(err));
  }
};

exports.postCart = async (req, res, next) => {
  const productId = req.body.productId;
  let newQuantity = 1;
  try {
    const cart = await req.user.getCart();
    const products = await cart.getProducts({
      where: {
        id: productId,
      }
    });
    let product;
    if (products.length > 0){
      product = products[0];
    }
    if (product){
      newQuantity = product.CartItem.quantity + 1;
    }
    else {
      product = await Product.findByPk(productId);
    }
    await cart.addProduct(product, {
      through: {
        quantity: newQuantity,
      }
    })
    res.redirect('/cart');
  }
  catch (err){
    console.log(err);
    return next(new Error(err));
  }
}

exports.deleteCart = async (req, res, next) => {
  const productId = req.body.productId;
  try {
    const cart = await req.user.getCart();
    const products = await cart.getProducts({
      where: {
        id: productId,
      }
    });
    if (products.length > 0){
      await products[0].CartItem.destroy();
    }
    res.redirect('/cart');
  }
  catch (err) {
    console.log(err);
    return next(new Error(err));
  }
}

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await req.user.getOrders({
      include: 'Products',
    });
    res.render('shop/orders', {
      orders,
      pageTitle: 'Order',
      path: '/order',
    })
  }
  catch (err){
    console.log(err);
    return next(new Error(err));
  }
};

exports.postOrders = async (req, res, next) => {
  try {
    const cart = await req.user.getCart();
    const products = await cart.getProducts();
    try {
      const order = await req.user.createOrder();
      order.addProducts(products.map(product => {
        product.OrderItem = {
          quantity: product.CartItem.quantity,
        }
        return product;
      }))
    }
    catch (err) {
      console.log(err);
      return next(new Error(err));
    }
    await cart.setProducts(null);
    res.redirect('/orders');
  }
  catch (err){
    console.log(err);
    return next(new Error(err));
  }
}

exports.getCheckout = (req, res, next) => {
  res.render('shop/checkout', {
    path: '/checkout',
    pageTitle: 'Checkout'
  });
};

exports.getInvoice = async (req, res, next) => {
  const orderId = req.params.orderId;
  try {
    const orders = await req.user.getOrders({
      where: {
        id: orderId,
      },
      include: "Products",
    });
    if (orders.length == 0){
      return next(new Error("Something wrong occured"));
    }
    const order = orders[0];
    const invoiceName = 'invoice-' + orderId;
    const invoicePath = path.join('data', 'invoices', invoiceName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
    const PDFDoc = new PDFDocument();
    PDFDoc.pipe(res);
    PDFDoc.pipe(fs.createWriteStream(invoicePath));

    // populate content to invoice file
    PDFDoc.fontSize(20).text("Invoice");
    PDFDoc.fontSize(16).text("-------------------------------");
    let totalPrice = 0;
    order.Products.forEach(prod => {
      PDFDoc.text(prod.title + " - " + prod.OrderItem.quantity + " x " + prod.price);
      totalPrice += prod.price * prod.OrderItem.quantity;
    })
    PDFDoc.text("--------");
    PDFDoc.text("Total price: " + totalPrice);

    PDFDoc.end();

    // Implementation for preloading data
    // fs.readFile(invoicePath, (err, data) => {
    //   if (!err){
    //     return next(new Error('Something wrong occured'));
    //   }
    //   res.send(data);
    // })    
  }
  catch (err){
    console.log(err);
    return next(new Error(err));
  }
}